/**
 * POST /api/v1/work/[publicId]/checkout/mpp — unattended A2A purchase (MPP rail).
 *
 * Stripe's Machine Payments Protocol is built on PaymentIntents (HTTP-402 style
 * flow), not a dedicated `mpp.sessions` API in stripe-node. We create a
 * destination-charge PaymentIntent: `application_fee_amount` (frozen fee) to
 * Hermes, `transfer_data.destination` to the worker. The buying agent receives
 * the `client_secret` and confirms via `/mpp/confirm`. We record the session in
 * `mpp_sessions` and ledger the idempotency key (brief requirement #1, #7).
 */
import { getDb } from "../../../../_lib/db.js";
import { mpp_sessions } from "../../../../../shared/schema.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../../_lib/http.js";
import { checkoutMppSchema } from "../../../../_lib/validate.js";
import { requireWork, findAgent } from "../../../../_lib/entities.js";
import { loadSettlementContext } from "../../../../_lib/settlement.js";
import { createPaymentIntentDestinationCharge } from "../../../../_lib/stripe.js";
import {
  claimIdempotencyKey,
  storeIdempotentResponse,
  releaseIdempotencyKey,
} from "../../../../_lib/idempotency.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");
    const input = await parseBody(req, checkoutMppSchema);

    const work = await requireWork(publicId);
    const ctx = await loadSettlementContext(work);

    let buyerAgentId: string | null = null;
    if (input.buyerAgentId) {
      const buyer = await findAgent(input.buyerAgentId);
      if (!buyer) throw new ApiError("NOT_FOUND", "buyer agent not found");
      buyerAgentId = buyer.id;
    }

    const scope = `checkout-mpp:${work.publicId}`;
    const claim = await claimIdempotencyKey(input.idempotencyKey, scope, {
      amount: ctx.amountCents,
      buyer: buyerAgentId,
    });
    if (claim.kind === "conflict") {
      throw new ApiError("IDEMPOTENCY_MISMATCH", "idempotency key reused with a different request");
    }
    if (claim.kind === "replay") {
      sendOk(res, claim.response);
      return;
    }

    try {
      const pi = await createPaymentIntentDestinationCharge({
        amountCents: ctx.amountCents,
        applicationFeeCents: ctx.feeCents,
        destinationAccountId: ctx.workerStripeAccountId,
        currency: ctx.currency,
        idempotencyKey: input.idempotencyKey,
        successUrl: "", // unused on PaymentIntents
        cancelUrl: "",
        workPublicId: work.publicId,
        description: work.title,
      });

      await getDb()
        .insert(mpp_sessions)
        .values({
          workRequestId: work.id,
          requesterAgentId: buyerAgentId ?? undefined,
          workerAgentId: ctx.workerAgentId,
          stripeSessionId: pi.id,
          status: "created",
          amountCents: ctx.amountCents,
          feeCents: ctx.feeCents,
        })
        .onConflictDoNothing({ target: mpp_sessions.stripeSessionId });

      const payload = {
        session_id: pi.id,
        client_secret: pi.client_secret,
        amount: ctx.amountCents,
        fee: ctx.feeCents,
      };
      await storeIdempotentResponse(input.idempotencyKey, payload);
      sendOk(res, payload, 201);
    } catch (err) {
      // The side effect didn't complete; free the key so a retry can proceed.
      await releaseIdempotencyKey(input.idempotencyKey);
      throw err;
    }
  },
});
