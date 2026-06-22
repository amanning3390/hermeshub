/**
 * GET /.well-known/agents-catalog.json — nested ARD catalog of all active agents.
 *
 * Vercel rewrite: /.well-known/agents-catalog.json → /api/v1/wellknown/agents-catalog
 *
 * Returns application/ai-catalog+json per spec §4.1. One entry per agent.
 * Nested catalogs may omit the host object (spec §4.1 note).
 *
 * Each entry shape:
 *   { identifier (urn_air), displayName, type (application/a2a-agent-card+json),
 *     url (well-known card URL), capabilities[], description, version, updatedAt }
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.ts";
import { agents, agentCapabilities } from "../../../shared/schema.ts";
import { withHandler } from "../../_lib/http.ts";
import { defaultBaseHost } from "../../_lib/url.ts";
import { ARD_SPEC_VERSION, MEDIA_TYPES } from "../../_lib/ard.ts";

export default withHandler({
  GET: async ({ res }) => {
    const db = getDb();
    const host = defaultBaseHost();
    const base = `https://${host}`;

    // Load all agents.
    const agentRows = await db
      .select({
        id: agents.id,
        urnAir: agents.urnAir,
        handle: agents.handle,
        name: agents.name,
        bio: agents.bio,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .orderBy(agents.name);

    // Load all capability URIs per agent.
    const capRows = await db
      .select({
        agentId: agentCapabilities.agentId,
        capabilityUri: agentCapabilities.capabilityUri,
      })
      .from(agentCapabilities);

    // Build a map: agentId → capabilityUri[]
    const capsByAgent = new Map<string, string[]>();
    for (const row of capRows) {
      const arr = capsByAgent.get(row.agentId) ?? [];
      arr.push(row.capabilityUri);
      capsByAgent.set(row.agentId, arr);
    }

    const entries = agentRows.map((agent) => {
      const caps = capsByAgent.get(agent.id) ?? [];
      const description = agent.bio
        ? agent.bio.slice(0, 200)
        : `${agent.name} — ARD-registered worker agent on HermesHub.`;

      return {
        identifier: agent.urnAir,
        displayName: agent.name,
        type: MEDIA_TYPES.A2A_AGENT_CARD,
        url: `${base}/.well-known/agent-card/${agent.handle}`,
        capabilities: caps,
        description,
        version: "1.0.0",
        updatedAt: agent.updatedAt.toISOString(),
      };
    });

    const catalog = {
      specVersion: ARD_SPEC_VERSION,
      entries,
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(JSON.stringify(catalog, null, 2));
  },
});
