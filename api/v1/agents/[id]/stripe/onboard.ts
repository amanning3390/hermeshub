/**
 * POST /api/v1/agents/[id]/stripe/onboard — start Stripe Connect onboarding.
 *
 * Idempotent: if the agent already has a `stripe_accounts` row we reuse its
 * connected account id; otherwise we create an Express account (with an
 * idempotency key derived from the agent so concurrent calls collapse to one)
 * and persist it. Either way we always mint a *fresh* AccountLink — links are
 * single-use and short-lived, so re-onboarding must return a new URL.
 */
import { getDb } from "../../../../_lib/db.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../../_lib/http.js";
import { stripeOnboardSchema } from "../../../../_lib/validate.js";
import { requireAgent } from "../../../../_lib/entities.js";
import { createExpressAccount, createAccountLink } from "../../../../_lib/stripe.js";
import {
  getStripeAccountForAgent,
  insertStripeAccount,
} from "../../../../_lib/stripe-accounts.js";
import { absoluteUrl } from "../../../../_lib/url.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const id = param(req, "id");
    if (!id) throw new ApiError("VALIDATION", "missing id");
    const input = await parseBody(req, stripeOnboardSchema);

    const agent = await requireAgent(id);

    let accountId: string;
    const existing = await getStripeAccountForAgent(agent.id);
    if (existing) {
      accountId = existing.stripeAccountId;
    } else {
      // Idempotency key keyed to the agent: a retry never creates a 2nd account.
      const account = await createExpressAccount(input.email, `connect-acct:${agent.id}`);
      await insertStripeAccount(agent.id, account);
      accountId = account.id;
    }

    const link = await createAccountLink(
      accountId,
      absoluteUrl(`/api/v1/agents/${agent.id}/stripe/onboard`),
      absoluteUrl(`/#/agents/${agent.id}?onboarded=1`),
    );

    sendOk(res, { account_id: accountId, onboarding_url: link.url, expires_at: link.expires_at });
  },
});
