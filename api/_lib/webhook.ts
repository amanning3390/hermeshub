/**
 * Stripe webhook verification + dedup (brief constraint #8).
 *
 * Every inbound webhook is verified with `stripe.webhooks.constructEvent` against
 * the raw request body and the signing secret. Unsigned or tampered payloads are
 * rejected. Verified events are recorded in `webhook_events` keyed by Stripe's
 * event id; replays (Stripe retries at-least-once) are detected and skipped so
 * each event's side effects run exactly once.
 */
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getStripe } from "./stripe.js";
import { getDb } from "./db.js";
import { webhook_events } from "../../shared/schema.js";

/**
 * Verify a raw webhook body + signature header. Throws on failure so the route
 * can return 400. The `rawBody` MUST be the unparsed bytes/string Stripe sent.
 */
export function constructEvent(rawBody: string | Buffer, signature: string | undefined): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  if (!signature) {
    throw new Error("missing Stripe-Signature header");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

export type RecordOutcome = { kind: "new" } | { kind: "duplicate" };

/**
 * Record a verified event for dedup. Returns `duplicate` if the event id was
 * already seen (so the caller can no-op). Uses `ON CONFLICT DO NOTHING` on the
 * unique stripe_event_id so concurrent retries collapse to one winner.
 */
export async function recordEvent(event: Stripe.Event): Promise<RecordOutcome> {
  const db = getDb();
  const inserted = await db
    .insert(webhook_events)
    .values({
      stripeEventId: event.id,
      type: event.type,
      payload: event as unknown as object,
      status: "received",
    })
    .onConflictDoNothing({ target: webhook_events.stripeEventId })
    .returning({ id: webhook_events.id });

  return inserted.length > 0 ? { kind: "new" } : { kind: "duplicate" };
}

/** Mark an event processed (terminal) with an optional status label. */
export async function markProcessed(stripeEventId: string, status = "processed"): Promise<void> {
  await getDb()
    .update(webhook_events)
    .set({ status, processedAt: new Date() })
    .where(eq(webhook_events.stripeEventId, stripeEventId));
}
