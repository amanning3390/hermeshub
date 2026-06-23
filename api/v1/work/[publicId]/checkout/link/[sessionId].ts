/**
 * GET /api/v1/work/[publicId]/checkout/link/[sessionId] — poll session status.
 *
 * Used by the success page before the webhook lands. Reads the live Checkout
 * Session from Stripe (payment_status + status) alongside our local row so the
 * UI can show "processing" vs "paid" without waiting on the async webhook.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../../../../../_lib/db.js";
import { checkout_sessions } from "../../../../../../shared/schema.js";
import { withHandler, sendOk, param, ApiError } from "../../../../../_lib/http.js";
import { requireWork } from "../../../../../_lib/entities.js";
import { getStripe } from "../../../../../_lib/stripe.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    const sessionId = param(req, "sessionId");
    if (!publicId || !sessionId) throw new ApiError("VALIDATION", "missing publicId or sessionId");

    const work = await requireWork(publicId);
    const db = getDb();
    const rows = await db
      .select()
      .from(checkout_sessions)
      .where(
        and(
          eq(checkout_sessions.workRequestId, work.id),
          eq(checkout_sessions.stripeSessionId, sessionId),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new ApiError("NOT_FOUND", "checkout session not found for this work");

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    sendOk(res, {
      session_id: sessionId,
      local_status: rows[0].status,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
    });
  },
});
