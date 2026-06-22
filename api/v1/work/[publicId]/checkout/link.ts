/**
 * POST /api/v1/work/[publicId]/checkout/link — human-supervised Link/Card rail.
 *
 * Creates a Stripe Checkout Session (`mode=payment`) as a destination charge:
 * the application fee (from the work's frozen snapshot) routes to Hermes and the
 * net settles to the worker's connected account. Link is auto-included by
 * omitting `payment_method_types` (Stripe surfaces eligible methods from the
 * dashboard config). Persists a `checkout_sessions` row; the webhook completes
 * settlement on `checkout.session.completed`.
 */
import { getDb } from "../../../../_lib/db.ts";
import { checkout_sessions } from "../../../../../shared/schema.ts";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../../_lib/http.ts";
import { checkoutLinkSchema } from "../../../../_lib/validate.ts";
import { requireWork } from "../../../../_lib/entities.ts";
import { loadSettlementContext } from "../../../../_lib/settlement.ts";
import { createCheckoutDestinationCharge } from "../../../../_lib/stripe.ts";
import { idempotencyKeyFor } from "../../../../_lib/idem.ts";
import { absoluteUrl } from "../../../../_lib/url.ts";

export default withHandler({
  POST: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");
    const input = await parseBody(req, checkoutLinkSchema);

    const work = await requireWork(publicId);
    const ctx = await loadSettlementContext(work);

    const idempotencyKey =
      input.idempotencyKey ?? idempotencyKeyFor("checkout-link", work.publicId, ctx.amountCents);

    const session = await createCheckoutDestinationCharge({
      amountCents: ctx.amountCents,
      applicationFeeCents: ctx.feeCents,
      destinationAccountId: ctx.workerStripeAccountId,
      currency: ctx.currency,
      idempotencyKey,
      successUrl: absoluteUrl(
        `/#/checkout/success?session_id={CHECKOUT_SESSION_ID}&work=${work.publicId}`,
      ),
      cancelUrl: absoluteUrl(`/#/checkout/cancel`),
      workPublicId: work.publicId,
      description: work.title,
    });

    await getDb()
      .insert(checkout_sessions)
      .values({
        workRequestId: work.id,
        stripeSessionId: session.id,
        mode: "payment",
        status: "created",
        amountCents: ctx.amountCents,
        feeCents: ctx.feeCents,
      })
      .onConflictDoNothing({ target: checkout_sessions.stripeSessionId });

    sendOk(res, { url: session.url, session_id: session.id }, 201);
  },
});
