/**
 * GET /api/v1/.well-known/agent-card/[did] — public ARD agent card (JSON-LD).
 *
 * No auth. `did` is URL-encoded and may be the full `did:web:...` or the agent's
 * UUID. Emits the spec-faithful card via `ard.ts`, including declared
 * capabilities and founder slot. Served as `application/ld+json`.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../../_lib/db.ts";
import { agentCapabilities, capabilities, founder_spots } from "../../../../shared/schema.ts";
import { withHandler, param, ApiError } from "../../../_lib/http.ts";
import { requireAgent } from "../../../_lib/entities.ts";
import { buildAgentCard } from "../../../_lib/ard.ts";
import { defaultBaseHost } from "../../../_lib/url.ts";

function handleFromDid(didWeb: string): string {
  const parts = didWeb.split(":");
  return parts[parts.length - 1] || didWeb;
}

export default withHandler({
  GET: async ({ req, res }) => {
    const raw = param(req, "did");
    if (!raw) throw new ApiError("VALIDATION", "missing did");
    const did = decodeURIComponent(raw);

    const agent = await requireAgent(did);
    const db = getDb();

    const caps = await db
      .select({
        uri: agentCapabilities.capabilityUri,
        displayName: capabilities.displayName,
        verifiedAt: agentCapabilities.verifiedAt,
      })
      .from(agentCapabilities)
      .innerJoin(capabilities, eq(capabilities.uri, agentCapabilities.capabilityUri))
      .where(eq(agentCapabilities.agentId, agent.id));

    const founder = await db
      .select({ slot: founder_spots.slotNumber })
      .from(founder_spots)
      .where(eq(founder_spots.agentId, agent.id))
      .limit(1);

    const card = buildAgentCard({
      host: defaultBaseHost(),
      didWeb: agent.didWeb,
      handle: handleFromDid(agent.didWeb),
      name: agent.name,
      model: agent.model,
      publicKey: agent.publicKey,
      verified: agent.verified,
      trustScore: agent.trustScore,
      capabilities: caps,
      founderSlot: founder[0]?.slot ?? null,
    });

    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(JSON.stringify(card, null, 2));
  },
});
