/**
 * POST /api/v1/agents/[id]/capabilities — declare a capability claim.
 *
 * The agent proves control of its key by signing a canonical payload
 * `{ agent_did, capability_uri, nonce, ts }` with its Ed25519 private key. We
 * verify against the public key on the agent row, reject stale timestamps, then
 * upsert the claim (re-declaring updates price/SLA/sandbox).
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../../_lib/db.js";
import { agentCapabilities, capabilities } from "../../../../shared/schema.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../_lib/http.js";
import { declareCapabilitySchema } from "../../../_lib/validate.js";
import { requireAgent } from "../../../_lib/entities.js";
import { verifyEd25519, canonicalize } from "../../../_lib/auth.js";

const SIG_MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

function usdToCents(usd: number | undefined): number | undefined {
  return usd == null ? undefined : Math.round(usd * 100);
}

export default withHandler({
  POST: async ({ req, res }) => {
    const id = param(req, "id");
    if (!id) throw new ApiError("VALIDATION", "missing id");
    const input = await parseBody(req, declareCapabilitySchema);

    const agent = await requireAgent(id);

    // Replay/skew guard, then signature check over the canonical payload.
    const skew = Math.abs(Date.now() - input.ts);
    if (skew > SIG_MAX_SKEW_MS) {
      throw new ApiError("UNAUTHORIZED", "signature timestamp outside allowed window");
    }
    const message = canonicalize({
      agent_urn: agent.urnAir,
      capability_uri: input.capabilityUri,
      nonce: input.nonce,
      ts: input.ts,
    });
    const ok = await verifyEd25519(message, input.signature, agent.publicKey);
    if (!ok) throw new ApiError("UNAUTHORIZED", "invalid Ed25519 signature");

    const db = getDb();
    const capRows = await db
      .select({ uri: capabilities.uri })
      .from(capabilities)
      .where(eq(capabilities.uri, input.capabilityUri))
      .limit(1);
    if (!capRows[0]) {
      throw new ApiError("NOT_FOUND", `capability does not exist: ${input.capabilityUri}`);
    }

    if (
      input.priceMinUsd != null &&
      input.priceMaxUsd != null &&
      input.priceMinUsd > input.priceMaxUsd
    ) {
      throw new ApiError("VALIDATION", "price_min_usd must not exceed price_max_usd");
    }

    const values = {
      agentId: agent.id,
      capabilityUri: input.capabilityUri,
      slaP95Ms: input.slaP95Ms,
      priceMinCents: usdToCents(input.priceMinUsd),
      priceMaxCents: usdToCents(input.priceMaxUsd),
      sandboxUrl: input.sandboxUrl,
    };

    const upserted = await db
      .insert(agentCapabilities)
      .values(values)
      .onConflictDoUpdate({
        target: [agentCapabilities.agentId, agentCapabilities.capabilityUri],
        set: {
          slaP95Ms: values.slaP95Ms,
          priceMinCents: values.priceMinCents,
          priceMaxCents: values.priceMaxCents,
          sandboxUrl: values.sandboxUrl,
        },
      })
      .returning();

    sendOk(res, { capability: upserted[0] }, 201);
  },
});
