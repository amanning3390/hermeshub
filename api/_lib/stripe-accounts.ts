/**
 * Persistence helpers for the `stripe_accounts` table.
 *
 * Centralizes the upsert used by the onboarding flow, the refresh poll, and the
 * `account.updated` webhook so the connected-account capability flags
 * (charges/payouts/details) are written identically everywhere.
 */
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { stripe_accounts, type StripeAccount } from "../../shared/schema.js";

export async function getStripeAccountForAgent(agentId: string): Promise<StripeAccount | null> {
  const rows = await getDb()
    .select()
    .from(stripe_accounts)
    .where(eq(stripe_accounts.agentId, agentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getStripeAccountByStripeId(
  stripeAccountId: string,
): Promise<StripeAccount | null> {
  const rows = await getDb()
    .select()
    .from(stripe_accounts)
    .where(eq(stripe_accounts.stripeAccountId, stripeAccountId))
    .limit(1);
  return rows[0] ?? null;
}

/** Insert the link between an agent and a freshly-created connected account. */
export async function insertStripeAccount(
  agentId: string,
  account: Stripe.Account,
): Promise<StripeAccount> {
  const rows = await getDb()
    .insert(stripe_accounts)
    .values({
      agentId,
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      lastSyncedAt: new Date(),
    })
    .returning();
  return rows[0];
}

/** Sync the capability flags from a retrieved/updated Stripe account. */
export async function syncStripeAccountFlags(account: Stripe.Account): Promise<void> {
  await getDb()
    .update(stripe_accounts)
    .set({
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      lastSyncedAt: new Date(),
    })
    .where(eq(stripe_accounts.stripeAccountId, account.id));
}

/** Extract the list of currently-due requirements for surfacing to the UI. */
export function requirementsDue(account: Stripe.Account): string[] {
  const r = account.requirements;
  if (!r) return [];
  return [...(r.currently_due ?? []), ...(r.past_due ?? [])];
}
