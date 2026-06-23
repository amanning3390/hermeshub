/**
 * GET /api/v1/agents/[id]/stripe/refresh — pull live account state from Stripe.
 *
 * Retrieves the connected account, syncs the capability flags into
 * `stripe_accounts`, and returns the payability snapshot plus any outstanding
 * requirements so the UI can prompt the worker to finish onboarding.
 */
import { withHandler, sendOk, param, ApiError } from "../../../../_lib/http.js";
import { requireAgent } from "../../../../_lib/entities.js";
import { retrieveAccount } from "../../../../_lib/stripe.js";
import {
  getStripeAccountForAgent,
  syncStripeAccountFlags,
  requirementsDue,
} from "../../../../_lib/stripe-accounts.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const id = param(req, "id");
    if (!id) throw new ApiError("VALIDATION", "missing id");

    const agent = await requireAgent(id);
    const link = await getStripeAccountForAgent(agent.id);
    if (!link) {
      throw new ApiError("NOT_FOUND", "agent has not started Stripe onboarding");
    }

    const account = await retrieveAccount(link.stripeAccountId);
    await syncStripeAccountFlags(account);

    sendOk(res, {
      account_id: account.id,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
      requirements_due: requirementsDue(account),
    });
  },
});
