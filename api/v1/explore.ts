/**
 * POST /api/v1/explore — ARD spec §7.3 (Optional).
 *
 * Returns facet buckets over the registry index. Explore does not federate;
 * it is scoped to this registry only (spec §7.3).
 *
 * Initially gated by env EXPLORE_ENABLED=true. When disabled (default), returns
 * 501 with ARD error envelope per spec §7.3 final paragraph.
 *
 * When enabled, returns facets over: type, tags (capabilities.domain),
 * capabilities (capability URIs).
 */
import { sql, eq, count } from "drizzle-orm";
import { getDb } from "../_lib/db.js";
import {
  agents,
  agentCapabilities,
  capabilities,
} from "../../shared/schema.js";
import { withHandler, parseBody } from "../_lib/http.js";
import { ardError, MEDIA_TYPES } from "../_lib/ard.js";
import { z } from "zod";

const exploreBodySchema = z.object({
  query: z
    .object({
      text: z.string().max(2000).optional(),
      filter: z.record(z.unknown()).optional(),
    })
    .optional(),
  resultType: z
    .object({
      facets: z
        .array(
          z.object({
            field: z.string(),
            limit: z.number().int().min(1).max(200).optional().default(20),
            minCount: z.number().int().min(0).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export default withHandler({
  POST: async ({ req, res }) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (process.env.EXPLORE_ENABLED === "false") {
      res.status(501).send(
        JSON.stringify(
          ardError(
            "INTERNAL_ERROR",
            "Explore is disabled. Use /search for discovery.",
          ),
        ),
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await parseBody(req, exploreBodySchema);
    } catch {
      res.status(400).send(JSON.stringify(ardError("INVALID_ARGUMENT", "invalid request body")));
      return;
    }

    const db = getDb();
    const requestedFacets: Array<{ field: string; limit: number; minCount?: number }> =
      (body.resultType?.facets as Array<{ field: string; limit?: number; minCount?: number }> | undefined)?.map((f) => ({ field: f.field, limit: f.limit ?? 20, minCount: f.minCount })) ?? [
        { field: "type", limit: 20 },
        { field: "tags", limit: 20 },
        { field: "capabilities", limit: 20 },
      ];

    const facets: Record<string, unknown> = {};

    for (const facetReq of requestedFacets) {
      const limit = facetReq.limit ?? 20;
      const minCount = facetReq.minCount ?? 0;

      if (facetReq.field === "type") {
        const totalAgents = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(agents);
        const n = totalAgents[0]?.n ?? 0;
        facets["type"] = {
          buckets: n > 0
            ? [{ value: MEDIA_TYPES.A2A_AGENT_CARD, count: n }]
            : [],
          otherCount: 0,
        };
      } else if (facetReq.field === "tags") {
        const rows = await db
          .select({
            value: capabilities.domain,
            count: sql<number>`count(distinct ${agentCapabilities.agentId})::int`,
          })
          .from(agentCapabilities)
          .innerJoin(capabilities, eq(capabilities.uri, agentCapabilities.capabilityUri))
          .groupBy(capabilities.domain)
          .orderBy(sql`count(distinct ${agentCapabilities.agentId}) DESC`)
          .limit(limit + 1);

        const visible = rows.slice(0, limit).filter((r) => r.count >= minCount);
        const otherCount = rows.length > limit ? rows[limit].count : 0;
        facets["tags"] = { buckets: visible, otherCount };
      } else if (facetReq.field === "capabilities") {
        const rows = await db
          .select({
            value: agentCapabilities.capabilityUri,
            count: sql<number>`count(distinct ${agentCapabilities.agentId})::int`,
          })
          .from(agentCapabilities)
          .groupBy(agentCapabilities.capabilityUri)
          .orderBy(sql`count(distinct ${agentCapabilities.agentId}) DESC`)
          .limit(limit + 1);

        const visible = rows.slice(0, limit).filter((r) => r.count >= minCount);
        const otherCount = rows.length > limit ? rows[limit].count : 0;
        facets["capabilities"] = { buckets: visible, otherCount };
      }
      // Unknown fields: skip (registry-defined behavior per spec §7.1).
    }

    res.status(200).send(
      JSON.stringify({ resultType: "facets", facets }, null, 2),
    );
  },
});
