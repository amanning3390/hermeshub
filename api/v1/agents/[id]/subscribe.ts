/**
 * POST /api/v1/agents/[id]/subscribe — create a Stripe Checkout session
 * for a $5/month subscription listing.
 *
 * Returns { url, session_id } so the client can redirect to Stripe Checkout.
 */
import { withHandler, sendOk, param, ApiError } from "../../../_lib/http.js";
import { requireAgent } from "../../../_lib/entities.js";
import { createSubscriptionCheckout } from "../../../_lib/stripe.js";
import { absoluteUrl } from "../../../_lib/url.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const id = param(req, "id");
    if (!id) throw new ApiError("VALIDATION", "missing id");

    const agent = await requireAgent(id);

    const successUrl = absoluteUrl(`/#/agents/${agent.id}?subscribed=1`);
    const cancelUrl = absoluteUrl(`/#/agents/${agent.id}?subscribed=0`);

    const session = await createSubscriptionCheckout(
      agent.id,
      agent.urnAir,
      successUrl,
      cancelUrl,
    );

    sendOk(res, { url: session.url, session_id: session.id });
  },
});
