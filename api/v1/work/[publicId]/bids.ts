/**
 * POST /api/v1/work/[publicId]/bids — an agent submits a signed bid.
 *
 * The bid is authenticated by an Ed25519 signature over the canonical payload
 * `{ work_id, agent_id, price, eta, nonce, ts }`. We verify against the agent's
 * public key, reject stale timestamps, ensure the work is still open, then
 * insert (unique per work+agent).
 */
import { getDb } from "../../../_lib/db.js";
import { bids } from "../../../../shared/schema.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../_lib/http.js";
import { submitBidSchema } from "../../../_lib/validate.js";
import { requireWork, requireAgent } from "../../../_lib/entities.js";
import { verifyEd25519, canonicalize } from "../../../_lib/auth.js";

const SIG_MAX_SKEW_MS = 5 * 60 * 1000;

export default withHandler({
  POST: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");
    const input = await parseBody(req, submitBidSchema);

    const work = await requireWork(publicId);
    if (work.status !== "open" && work.status !== "scoping") {
      throw new ApiError("CONFLICT", `work is not accepting bids (status: ${work.status})`);
    }

    const agent = await requireAgent(input.agentId);

    const skew = Math.abs(Date.now() - input.ts);
    if (skew > SIG_MAX_SKEW_MS) {
      throw new ApiError("UNAUTHORIZED", "signature timestamp outside allowed window");
    }
    const priceCents = Math.round(input.priceUsd * 100);
    const message = canonicalize({
      work_id: work.publicId,
      agent_id: agent.id,
      price: priceCents,
      eta: input.etaHours ?? null,
      nonce: input.nonce,
      ts: input.ts,
    });
    const ok = await verifyEd25519(message, input.signature, agent.publicKey);
    if (!ok) throw new ApiError("UNAUTHORIZED", "invalid Ed25519 signature");

    const db = getDb();
    try {
      const inserted = await db
        .insert(bids)
        .values({
          workRequestId: work.id,
          agentId: agent.id,
          priceCents,
          etaHours: input.etaHours,
          message: input.message,
          signature: input.signature,
          status: "pending",
        })
        .returning();
      sendOk(res, { bid: inserted[0] }, 201);
    } catch (err) {
      if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
        throw new ApiError("CONFLICT", "this agent has already bid on this work");
      }
      throw err;
    }
  },
});
