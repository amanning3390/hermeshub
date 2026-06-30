/**
 * POST /api/v1/webhooks/stripe — Stripe webhook handler for subscription events.
 *
 * Handles:
 *   - checkout.session.completed   → create subscription record, set agent active
 *   - invoice.paid                  → set subscription active, update currentPeriodEnd
 *   - invoice.payment_failed        → set subscription delinquent
 *   - customer.subscription.deleted → set subscription canceled, agent inactive
 *
 * Body parsing is disabled so `readRawBody` sees the unparsed stream for
 * signature verification.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { agents, subscriptions, webhook_events } from "../../../shared/schema.js";
import { readRawBody } from "../../_lib/http.js";
import { constructEvent, recordEvent, markProcessed } from "../../_lib/webhook.js";
import { log } from "../../_lib/log.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if ((req.method ?? "").toUpperCase() !== "POST") {
    res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } });
    return;
  }

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
    await getDb()
      .delete(webhook_events)
      .where(eq(webhook_events.stripeEventId, event.id))
      .catch(() => {});
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "handler failed" } });
  }
}

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "invoice.paid":
      await onInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await onInvoiceFailed(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      log({ level: "info", msg: "unhandled webhook type", type: event.type });
  }
}

/**
 * checkout.session.completed — the subscription was created.
 * Extract the subscription ID and customer ID from the session, look up the
 * agent via client_reference_id, create a subscription record, and set the
 * agent's subscriptionStatus to 'active'.
 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const agentId = session.client_reference_id;
  if (!agentId) {
    log({ level: "warn", msg: "checkout.session.completed missing client_reference_id" });
    return;
  }

  const subscriptionId = session.subscription as string | undefined;
  const customerId = session.customer as string | undefined;
  if (!subscriptionId || !customerId) {
    log({ level: "warn", msg: "checkout.session.completed missing subscription or customer id" });
    return;
  }

  const db = getDb();

  // Fetch the subscription from Stripe to get the price ID and period end.
  const stripe = (await import("../../_lib/stripe.js")).getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  // Insert subscription record (idempotent via unique stripe_subscription_id).
  await db
    .insert(subscriptions)
    .values({
      agentId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: "active",
      currentPeriodEnd,
    })
    .onConflictDoNothing({ target: subscriptions.stripeSubscriptionId });

  // Set agent subscription status to active.
  await db
    .update(agents)
    .set({ subscriptionStatus: "active", updatedAt: new Date() })
    .where(eq(agents.id, agentId));
}

/**
 * invoice.paid — recurring payment succeeded.
 * Update the subscription status to active and the current period end.
 */
async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string | undefined;
  if (!subscriptionId) return;

  const db = getDb();
  const currentPeriodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : null;

  await db
    .update(subscriptions)
    .set({ status: "active", currentPeriodEnd, updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  // Also update the agent's subscription status.
  const subRows = await db
    .select({ agentId: subscriptions.agentId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (subRows[0]) {
    await db
      .update(agents)
      .set({ subscriptionStatus: "active", updatedAt: new Date() })
      .where(eq(agents.id, subRows[0].agentId));
  }
}

/**
 * invoice.payment_failed — a recurring payment failed.
 * Set the subscription status to delinquent.
 */
async function onInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string | undefined;
  if (!subscriptionId) return;

  const db = getDb();

  await db
    .update(subscriptions)
    .set({ status: "delinquent", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  const subRows = await db
    .select({ agentId: subscriptions.agentId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (subRows[0]) {
    await db
      .update(agents)
      .set({ subscriptionStatus: "delinquent", updatedAt: new Date() })
      .where(eq(agents.id, subRows[0].agentId));
  }

  log({ level: "warn", msg: "invoice payment failed", subscriptionId });
}

/**
 * customer.subscription.deleted — the subscription was canceled.
 * Set the subscription status to canceled and the agent's subscriptionStatus to inactive.
 */
async function onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const db = getDb();

  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  const subRows = await db
    .select({ agentId: subscriptions.agentId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (subRows[0]) {
    await db
      .update(agents)
      .set({ subscriptionStatus: "inactive", updatedAt: new Date() })
      .where(eq(agents.id, subRows[0].agentId));
  }
}
