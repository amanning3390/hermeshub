/**
 * Shared Stripe client + subscription billing helpers.
 *
 * Simple subscription model: $5/month per agent listing via Stripe Checkout
 * in subscription mode. No Connect, no destination charges, no Express accounts.
 */
import Stripe from "stripe";

/** Pinned API version — keep in sync with the installed SDK's typings. */
export const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }

  _stripe = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    appInfo: { name: "HermesHub", url: "https://hermeshub.xyz" },
    typescript: true,
  });
  return _stripe;
}

/**
 * Create a Stripe Checkout Session in subscription mode for an agent listing.
 *
 * @param agentId   The agent's UUID (stored in metadata for webhook reconciliation)
 * @param urnAir    The agent's urn:air identifier (stored in metadata)
 * @param successUrl  URL to redirect after successful checkout
 * @param cancelUrl   URL to redirect after checkout cancellation
 * @returns Stripe Checkout Session
 */
export async function createSubscriptionCheckout(
  agentId: string,
  urnAir: string,
  successUrl: string,
  cancelUrl: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID environment variable is not set");
  }

  return stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: agentId,
    metadata: {
      agent_id: agentId,
      urn_air: urnAir,
    },
  }, {
    idempotencyKey: `sub-checkout:${agentId}`,
  });
}
