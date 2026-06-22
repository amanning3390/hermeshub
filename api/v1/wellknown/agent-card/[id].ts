/**
 * GET /.well-known/agent-card/[id] — A2A-compliant agent card.
 *
 * Vercel rewrite: /.well-known/agent-card/:id → /api/v1/wellknown/agent-card/:id
 *
 * `:id` is either the handle slug (e.g. "lumen-cut") or the full urn_air.
 *
 * Returns Content-Type: application/a2a-agent-card+json per ARD spec §4.1.
 * Flat JSON, no JSON-LD @context or @graph.
 *
 * 404 errors use the ARD error envelope per spec Appendix B.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../../_lib/db.ts";
import {
  agentCapabilities,
  capabilities,
  founder_spots,
  stripe_accounts,
} from "../../../../shared/schema.ts";
import { withHandler, param } from "../../../_lib/http.ts";
import { findAgent } from "../../../_lib/entities.ts";
import { buildAgentCard, ardError, MEDIA_TYPES } from "../../../_lib/ard.ts";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default withHandler({
  GET: async ({ req, res }) => {
    const raw = param(req, "id");
    if (!raw) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(400).send(
        JSON.stringify(ardError("INVALID_ARGUMENT", "missing agent id or handle")),
      );
      return;
    }

    const id = decodeURIComponent(raw);
    const agent = await findAgent(id);

    if (!agent) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(404).send(
        JSON.stringify(ardError("NOT_FOUND", `agent not found: ${id}`)),
      );
      return;
    }

    const db = getDb();

    const caps = await db
      .select({
        uri: agentCapabilities.capabilityUri,
        displayName: capabilities.displayName,
        exampleQueries: capabilities.exampleQueries,
        verifiedAt: agentCapabilities.verifiedAt,
      })
      .from(agentCapabilities)
      .innerJoin(capabilities, eq(capabilities.uri, agentCapabilities.capabilityUri))
      .where(eq(agentCapabilities.agentId, agent.id));

    const founderRows = await db
      .select({ slot: founder_spots.slotNumber })
      .from(founder_spots)
      .where(eq(founder_spots.agentId, agent.id))
      .limit(1);

    const stripeRows = await db
      .select({
        stripeAccountId: stripe_accounts.stripeAccountId,
        payoutsEnabled: stripe_accounts.payoutsEnabled,
      })
      .from(stripe_accounts)
      .where(eq(stripe_accounts.agentId, agent.id))
      .limit(1);

    // Collect representative queries from capability example_queries (up to 5 total).
    const repQueries: string[] = [];
    for (const cap of caps) {
      for (const q of cap.exampleQueries ?? []) {
        if (repQueries.length >= 5) break;
        repQueries.push(q);
      }
      if (repQueries.length >= 5) break;
    }

    const card = buildAgentCard({
      publisherDomain: agent.publisherDomain,
      handle: agent.handle,
      urnAir: agent.urnAir,
      name: agent.name,
      bio: agent.bio,
      model: agent.model,
      publicKey: agent.publicKey,
      verified: agent.verified,
      trustScore: agent.trustScore,
      updatedAt: agent.updatedAt,
      capabilities: caps,
      founderSlot: founderRows[0]?.slot ?? null,
      stripeAccountId: stripeRows[0]?.stripeAccountId ?? null,
      payoutsEnabled: stripeRows[0]?.payoutsEnabled ?? false,
    });

    // Override representativeQueries with real queries from capability data.
    if (repQueries.length > 0) {
      (card as Record<string, unknown>).representativeQueries = repQueries;
    }

    res.setHeader("Content-Type", `${MEDIA_TYPES.A2A_AGENT_CARD}; charset=utf-8`);
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(JSON.stringify(card, null, 2));
  },
});
