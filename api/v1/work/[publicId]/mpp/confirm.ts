/**
 * POST /api/v1/work/[publicId]/mpp/confirm — confirm an MPP PaymentIntent.
 *
 * The buying agent confirms the PaymentIntent created by `/checkout/mpp` with
 * its payment method. We confirm via the Stripe SDK (idempotency key required),
 * update `mpp_sessions.status` to mirror the PI status, and let the webhook
 * (`payment_intent.succeeded`) finalize settlement + payout records.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../../../../_lib/db.js";
import { mpp_sessions } from "../../../../../shared/schema.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../../_lib/http.js";
import { mppConfirmSchema } from "../../../../_lib/validate.js";
import { requireWork } from "../../../../_lib/entities.js";
import { getStripe } from "../../../../_lib/stripe.js";

/** Map a Stripe PaymentIntent status to our session status vocabulary. */
function sessionStatusFor(piStatus: string): string {
  switch (piStatus) {
    case "succeeded":
      return "completed";
    case "processing":
    case "requires_capture":
      return "pending";
    case "canceled":
      return "cancelled";
    case "requires_payment_method":
    case "requires_action":
    case "requires_confirmation":
      return "pending";
    default:
      return "pending";
  }
}

export default withHandler({
  POST: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");
    const input = await parseBody(req, mppConfirmSchema);

    const work = await requireWork(publicId);
    const db = getDb();

    const rows = await db
      .select()
      .from(mpp_sessions)
      .where(
        and(
          eq(mpp_sessions.workRequestId, work.id),
          eq(mpp_sessions.stripeSessionId, input.sessionId),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new ApiError("NOT_FOUND", "mpp session not found for this work");

    const pi = await getStripe().paymentIntents.confirm(
      input.sessionId,
      { payment_method: input.paymentMethodId },
      { idempotencyKey: input.idempotencyKey },
    );

    const status = sessionStatusFor(pi.status);
    await db
      .update(mpp_sessions)
      .set({ status })
      .where(eq(mpp_sessions.stripeSessionId, input.sessionId));

    sendOk(res, { session_id: pi.id, status, payment_intent_status: pi.status });
  },
});
