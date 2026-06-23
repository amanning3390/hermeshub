/**
 * Shared Stripe client + Connect helpers (non-custodial settlement).
 *
 * HermesHub never custodies funds. Requesters pay workers directly through
 * Stripe Connect destination charges: the PaymentIntent / Checkout Session
 * carries `transfer_data[destination]` (the worker's connected account) plus an
 * `application_fee_amount` (Hermes' platform fee), so the split happens
 * atomically at capture (https://docs.stripe.com/connect/destination-charges).
 *
 * Every mutating Stripe call MUST pass an idempotency key (brief constraint #7);
 * the helpers here require one.
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

export interface DestinationChargeParams {
  /** Total amount the requester pays, in integer cents. */
  amountCents: number;
  /** Platform fee routed to Hermes, in integer cents. */
  applicationFeeCents: number;
  /** Worker's connected account id (acct_...). */
  destinationAccountId: string;
  currency: string;
  /** Idempotency key — required for every write. */
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
  /** Work request public id, threaded through for reconciliation. */
  workPublicId: string;
  description?: string;
}

/**
 * Create a Stripe Checkout Session as a destination charge with Link enabled.
 *
 * `automatic_payment_methods.enabled` surfaces Link automatically alongside card
 * (brief constraint / plan §9.5). The fee is taken via `application_fee_amount`
 * and the worker is the `transfer_data.destination`.
 */
export async function createCheckoutDestinationCharge(
  params: DestinationChargeParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency,
            unit_amount: params.amountCents,
            product_data: {
              name: params.description ?? `HermesHub work ${params.workPublicId}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: params.applicationFeeCents,
        transfer_data: { destination: params.destinationAccountId },
      },
      // Omitting `payment_method_types` lets Stripe auto-enable eligible methods
      // (card + Link) from the dashboard config — the recommended path for
      // surfacing Link in Checkout (plan §9.5).
      client_reference_id: params.workPublicId,
      metadata: { work_public_id: params.workPublicId },
    },
    { idempotencyKey: params.idempotencyKey },
  );
}

/**
 * Create a PaymentIntent destination charge (MPP / unattended-agent path).
 * Returns the PI so the caller can hand the client secret to the paying agent.
 */
export async function createPaymentIntentDestinationCharge(
  params: DestinationChargeParams,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.create(
    {
      amount: params.amountCents,
      currency: params.currency,
      application_fee_amount: params.applicationFeeCents,
      transfer_data: { destination: params.destinationAccountId },
      automatic_payment_methods: { enabled: true },
      description: params.description ?? `HermesHub work ${params.workPublicId}`,
      metadata: { work_public_id: params.workPublicId },
    },
    { idempotencyKey: params.idempotencyKey },
  );
}

/** Create a Connect Express account for a worker agent. */
export async function createExpressAccount(
  email: string | undefined,
  idempotencyKey: string,
): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.create(
    {
      type: "express",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    },
    { idempotencyKey },
  );
}

/** Create an onboarding AccountLink for a connected account. */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<Stripe.AccountLink> {
  const stripe = getStripe();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

/** Fetch a connected account's current capability flags. */
export async function retrieveAccount(accountId: string): Promise<Stripe.Account> {
  return getStripe().accounts.retrieve(accountId);
}
