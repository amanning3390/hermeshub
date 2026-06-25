/**
 * POST /api/v1/webhooks/stripe — the single Stripe webhook handler.
 *
 * Flow (brief §Webhook + requirements #2, #8, #10):
 *   1. Read the RAW request body (signature is computed over exact bytes, so
 *      Vercel's body parser is disabled below).
 *   2. Verify with `stripe.webhooks.constructEvent`; reject unsigned/tampered.
 *   3. Dedup on `webhook_events.stripe_event_id` (Stripe retries at-least-once).
 *   4. Dispatch by event type and apply settlement side effects.
 *   5. Return 200 on success; 400 on bad signature; 500 on handler error so
 *      Stripe retries. Never log full webhook payloads (security rule).
 *
 * Body parsing is disabled so `readRawBody` sees the unparsed stream.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import {
  checkout_sessions,
  mpp_sessions,
  payouts,
  work_requests,
  stripe_accounts,
  webhook_events,
} from "../../../shared/schema.js";
import { readRawBody } from "../../_lib/http.js";
import { constructEvent, recordEvent, markProcessed } from "../../_lib/webhook.js";
import { syncStripeAccountFlags } from "../../_lib/stripe-accounts.js";
import { log } from "../../_lib/log.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if ((req.method ?? "").toUpperCase() !== "POST") {
    res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } });
    return;
  }

  // Fail closed if the signing secret isn't configured (security rule).
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    log({ level: "error", path: req.url, msg: "STRIPE_WEBHOOK_SECRET not set — refusing webhook" });
    res.status(500).json({ ok: false, error: { code: "STRIPE_NOT_CONFIGURED", message: "webhook secret missing" } });
    return;
  }

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    const signature = req.headers["stripe-signature"] as string | undefined;
    event = constructEvent(raw, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    log({ level: "warn", path: req.url, msg: `webhook signature rejected: ${msg}` });
    res.status(400).json({ ok: false, error: { code: "VALIDATION", message: "invalid signature" } });
    return;
  }

  // Dedup: record once; duplicates are acknowledged without re-running effects.
  const outcome = await recordEvent(event);
  if (outcome.kind === "duplicate") {
    log({ level: "info", path: req.url, msg: "duplicate webhook", type: event.type });
    res.status(200).json({ ok: true, data: { deduped: true } });
    return;
  }

  try {
    await dispatch(event);
    await markProcessed(event.id, "processed");
    res.status(200).json({ ok: true, data: { received: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "handler error";
    log({ level: "error", path: req.url, type: event.type, msg: `webhook handler failed: ${msg}` });
    // Delete the dedup row so Stripe's retry re-runs the side effects: without
    // this the retry would be swallowed as a duplicate and the work would never
    // settle. Deletion is safe because the effects are themselves idempotent.
    await getDb()
      .delete(webhook_events)
      .where(eq(webhook_events.stripeEventId, event.id))
      .catch(() => {});
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "handler failed" } });
  }
}

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "account.updated":
      await onAccountUpdated(event.data.object as Stripe.Account);
      break;
    case "account.application.deauthorized":
      await onAccountDeauthorized(event);
      break;
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "payment_intent.succeeded":
      await onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case "transfer.created":
    case "transfer.reversed":
      await onTransfer(event.type, event.data.object as Stripe.Transfer);
      break;
    default:
      // Acknowledged + recorded but no side effect.
      log({ level: "info", msg: "unhandled webhook type", type: event.type });
  }
}

async function onAccountUpdated(account: Stripe.Account): Promise<void> {
  await syncStripeAccountFlags(account);
}

async function onAccountDeauthorized(event: Stripe.Event): Promise<void> {
  // The connected account id arrives as the event's `account` field.
  const accountId = (event as unknown as { account?: string }).account;
  if (!accountId) return;
  await getDb()
    .update(stripe_accounts)
    .set({ chargesEnabled: false, payoutsEnabled: false, lastSyncedAt: new Date() })
    .where(eq(stripe_accounts.stripeAccountId, accountId));
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const db = getDb();
  const rows = await db
    .select()
    .from(checkout_sessions)
    .where(eq(checkout_sessions.stripeSessionId, session.id))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  await db
    .update(checkout_sessions)
    .set({ status: "completed" })
    .where(eq(checkout_sessions.id, row.id));

  await markWorkPaidAndPayout(
    row.workRequestId,
    session.amount_total ?? row.amountCents,
    row.feeCents,
  );
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  // Idempotent backstop for the MPP rail.
  const db = getDb();
  const rows = await db
    .select()
    .from(mpp_sessions)
    .where(eq(mpp_sessions.stripeSessionId, pi.id))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  if (row.status !== "completed") {
    await db.update(mpp_sessions).set({ status: "completed" }).where(eq(mpp_sessions.id, row.id));
  }
  await markWorkPaidAndPayout(row.workRequestId, pi.amount_received || row.amountCents, row.feeCents);
}

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const db = getDb();
  await db
    .update(mpp_sessions)
    .set({ status: "failed" })
    .where(eq(mpp_sessions.stripeSessionId, pi.id));
  log({ level: "warn", msg: "payment_intent failed", type: "payment_intent.payment_failed" });
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const db = getDb();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  // Reconcile via the work linked through metadata if present.
  const workPublicId = charge.metadata?.work_public_id;
  if (workPublicId) {
    const works = await db
      .select({ id: work_requests.id })
      .from(work_requests)
      .where(eq(work_requests.publicId, workPublicId))
      .limit(1);
    if (works[0]) {
      await db.update(work_requests).set({ status: "cancelled" }).where(eq(work_requests.id, works[0].id));
      await db.update(payouts).set({ status: "reversed" }).where(eq(payouts.workRequestId, works[0].id));
    }
  }
  void piId;
}

async function onTransfer(type: string, transfer: Stripe.Transfer): Promise<void> {
  const db = getDb();
  const status = type === "transfer.reversed" ? "reversed" : "in_transit";
  // Link the transfer to a payout via its id when we have one recorded.
  await db
    .update(payouts)
    .set({ status, stripeTransferId: transfer.id })
    .where(eq(payouts.stripeTransferId, transfer.id));
}

/**
 * Mark the work paid and upsert a payout row (gross/fee/net). Idempotent: a
 * second completion event for the same work won't duplicate the payout because
 * we only insert when none exists for the work.
 */
async function markWorkPaidAndPayout(
  workRequestId: string,
  grossCents: number,
  feeCents: number,
): Promise<void> {
  const db = getDb();
  const works = await db
    .select()
    .from(work_requests)
    .where(eq(work_requests.id, workRequestId))
    .limit(1);
  const work = works[0];
  if (!work || !work.awardedAgentId) return;

  await db.update(work_requests).set({ status: "confirmed" }).where(eq(work_requests.id, work.id));

  const existing = await db
    .select({ id: payouts.id })
    .from(payouts)
    .where(eq(payouts.workRequestId, work.id))
    .limit(1);
  if (existing[0]) return;

  await db.insert(payouts).values({
    workRequestId: work.id,
    workerAgentId: work.awardedAgentId,
    grossCents,
    feeCents,
    netCents: grossCents - feeCents,
    status: "pending",
  });
}
