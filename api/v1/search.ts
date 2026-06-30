/**
 * POST /api/v1/search — ARD-compliant agent/capability search with semantic ranking.
 *
 * Implements ARD spec §7.2 (POST /search).
 *
 * Uses NVIDIA NIM embeddings for semantic ranking when available.
 * Falls back to text matching when NVIDIA_API_KEY is not set.
 *
 * Request body:
 *   {
 *     query: { text?: string; filter?: Record<string, unknown> }>;
 *     federation?: "auto" | "referrals" | "none";  // default "none"
 *     pageSize?: number;  // default 10, max 100
 *     pageToken?: string;
 *   }
 *
 * Response:
 *   {
 *     results: CatalogEntry & { score: number; source: string }[];
 *     referrals?: CatalogEntry[];  // only when federation === "referrals"
 *     pageToken?: string;
 *   }
 *
 * Score: 0–100 relevance metric. Per spec, MUST NOT be interpreted as a trust
 * or safety rating.
 *
 * Filter semantics (spec §7.1):
 *   - Values are arrays; bare scalar coerced to single-element array.
 *   - Within a key: OR. Across keys: AND.
 *   - Supported filter keys: type, tags, capabilities
 */
import { sql, eq, and, or, ilike, inArray } from "drizzle-orm";
import { getDb } from "../_lib/db.js";
import {
  agents,
  agentCapabilities,
  capabilities,
  federation_referrals,
} from "../../shared/schema.js";
import { withHandler, parseBody } from "../_lib/http.js";
import { defaultBaseHost, baseUrl } from "../_lib/url.js";
import { ardError, MEDIA_TYPES } from "../_lib/ard.js";
import { generateEmbedding, cosineSimilarity, textSimilarity } from "../_lib/embeddings.js";
import { z } from "zod";

const searchBodySchema = z.object({
  query: z
    .object({
      text: z.string().max(2000).optional(),
      filter: z.record(z.unknown()).optional(),
    })
    .optional(),
  federation: z.enum(["auto", "referrals", "none"]).optional().default("none"),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
  pageToken: z.string().optional(),
});

function decodePageToken(token: string | undefined): number {
  if (!token) return 0;
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    return typeof decoded.page === "number" ? Math.max(0, decoded.page) : 0;
  } catch {
    return 0;
  }
}

function encodePageToken(page: number): string {
  return Buffer.from(JSON.stringify({ page })).toString("base64");
}

/** Normalize filter value to array. */
function toArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  return [val];
}

export default withHandler({
  POST: async ({ req, res }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await parseBody(req, searchBodySchema);
    } catch {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(400).send(JSON.stringify(ardError("INVALID_ARGUMENT", "invalid request body")));
      return;
    }

    const qText = body.query?.text?.trim();
    const qFilter = body.query?.filter;

    if (!body.query || (!qText && (!qFilter || Object.keys(qFilter).length === 0))) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(400).send(
        JSON.stringify(
          ardError(
            "INVALID_ARGUMENT",
            "query.text or query.filter is required",
          ),
        ),
      );
      return;
    }

    const federation = body.federation ?? "none";

    if (federation === "auto") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(400).send(
        JSON.stringify(
          ardError(
            "INVALID_ARGUMENT",
            "auto federation not yet implemented; use 'referrals' or 'none'",
          ),
        ),
      );
      return;
    }

    const db = getDb();
    const host = defaultBaseHost();
    const base = baseUrl();
    const pageSize = body.pageSize ?? 10;
    const page = decodePageToken(body.pageToken ?? undefined);
    const offset = page * pageSize;

    // --- Build WHERE conditions from filter ---
    const conditions: ReturnType<typeof eq>[] = [];

    // GATE: Only return agents with active subscriptions AND online/unknown health.
    // Unsubscribed agents don't appear in search. Offline/stale agents are hidden.
    conditions.push(eq(agents.subscriptionStatus, "active"));
    // Note: we don't filter out 'unknown' health — agents that haven't been health-checked
    // yet still appear. Only 'offline' and 'stale' are excluded.
    // This is applied as a post-filter below since OR conditions on healthStatus
    // don't compose well with Drizzle's AND.

    if (qFilter) {
      if (qFilter["type"]) {
        const types = toArray(qFilter["type"]) as string[];
        if (!types.includes(MEDIA_TYPES.A2A_AGENT_CARD)) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(200).send(JSON.stringify({ results: [] }));
          return;
        }
      }

      if (qFilter["capabilities"]) {
        const capUris = toArray(qFilter["capabilities"]) as string[];
        const matchingAgents = await db
          .selectDistinct({ agentId: agentCapabilities.agentId })
          .from(agentCapabilities)
          .where(inArray(agentCapabilities.capabilityUri, capUris));
        const ids = matchingAgents.map((r) => r.agentId);
        if (ids.length === 0) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(200).send(JSON.stringify({ results: [] }));
          return;
        }
        conditions.push(inArray(agents.id, ids));
      }

      if (qFilter["tags"]) {
        const tags = toArray(qFilter["tags"]) as string[];
        const matchingAgents = await db
          .selectDistinct({ agentId: agentCapabilities.agentId })
          .from(agentCapabilities)
          .innerJoin(capabilities, eq(capabilities.uri, agentCapabilities.capabilityUri))
          .where(inArray(capabilities.domain, tags));
        const ids = matchingAgents.map((r) => r.agentId);
        if (ids.length === 0) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(200).send(JSON.stringify({ results: [] }));
          return;
        }
        conditions.push(inArray(agents.id, ids));
      }
    }

    // --- Determine whether to use semantic search ---
    // Generate query embedding if text is provided
    let queryEmbedding: number[] | null = null;
    if (qText) {
      queryEmbedding = await generateEmbedding(qText);
    }

    // --- Fetch agents matching filter conditions ---
    const where = conditions.length ? and(...conditions) : undefined;

    const rawRows = await db
      .select({
        id: agents.id,
        urnAir: agents.urnAir,
        handle: agents.handle,
        name: agents.name,
        bio: agents.bio,
        embedding: agents.embedding,
        updatedAt: agents.updatedAt,
        healthStatus: agents.healthStatus,
      })
      .from(agents)
      .where(where)
      .orderBy(agents.name)
      .limit(pageSize * 5 + 50)
      .offset(offset);

    // Post-filter: exclude offline and stale agents
    const healthyRows = rawRows.filter(
      (r) => r.healthStatus !== "offline" && r.healthStatus !== "stale",
    );

    // --- Score agents ---
    let scoredRows: {
      id: string;
      urnAir: string;
      handle: string;
      name: string;
      bio: string | null;
      updatedAt: Date;
      score: number;
    }[];

    if (qText) {
      // Semantic search: use embedding similarity or text fallback
      if (queryEmbedding) {
        scoredRows = healthyRows
          .map((r) => {
            const agentEmbedding = r.embedding as number[] | null;
            const sim = cosineSimilarity(queryEmbedding, agentEmbedding);
            // Normalize cosine similarity (-1..1) to 0..100 score
            const score = Math.round(Math.max(0, Math.min(100, sim * 100)));
            return {
              id: r.id,
              urnAir: r.urnAir,
              handle: r.handle,
              name: r.name,
              bio: r.bio,
              updatedAt: r.updatedAt,
              score,
            };
          })
          .sort((a, b) => b.score - a.score);
      } else {
        // Fallback: text similarity against name + bio
        scoredRows = healthyRows
          .map((r) => {
            const targetText = `${r.name} ${r.bio ?? ""}`;
            const sim = textSimilarity(qText, targetText);
            const score = Math.round(sim * 100);
            return {
              id: r.id,
              urnAir: r.urnAir,
              handle: r.handle,
              name: r.name,
              bio: r.bio,
              updatedAt: r.updatedAt,
              score,
            };
          })
          .sort((a, b) => b.score - a.score);
      }
    } else {
      // Filter-only path: no text ranking, assign default score
      scoredRows = healthyRows.map((r) => ({
        id: r.id,
        urnAir: r.urnAir,
        handle: r.handle,
        name: r.name,
        bio: r.bio,
        updatedAt: r.updatedAt,
        score: 50,
      }));
    }

    // Paginate after scoring
    const hasMore = scoredRows.length > pageSize;
    const pageRows = scoredRows.slice(0, pageSize);

    // Load capabilities for result agents.
    const agentIds = pageRows.map((r) => r.id);
    let capsByAgent = new Map<string, string[]>();
    if (agentIds.length > 0) {
      const capRows = await db
        .select({
          agentId: agentCapabilities.agentId,
          capabilityUri: agentCapabilities.capabilityUri,
        })
        .from(agentCapabilities)
        .where(inArray(agentCapabilities.agentId, agentIds));
      for (const row of capRows) {
        const arr = capsByAgent.get(row.agentId) ?? [];
        arr.push(row.capabilityUri);
        capsByAgent.set(row.agentId, arr);
      }
    }

    const results = pageRows.map((r) => ({
      identifier: r.urnAir,
      displayName: r.name,
      type: MEDIA_TYPES.A2A_AGENT_CARD,
      url: `${base}/.well-known/agent-card/${r.handle}`,
      capabilities: capsByAgent.get(r.id) ?? [],
      description: r.bio ? r.bio.slice(0, 200) : undefined,
      score: Math.round(Math.min(100, Math.max(0, r.score))),
      source: `${base}/api/v1/`,
    }));

    const response: Record<string, unknown> = { results };

    if (hasMore) {
      response.pageToken = encodePageToken(page + 1);
    }

    // Include federation referrals when requested.
    if (federation === "referrals") {
      const referralRows = await db
        .select({
          identifier: federation_referrals.identifier,
          displayName: federation_referrals.displayName,
          type: federation_referrals.type,
          url: federation_referrals.url,
          description: federation_referrals.description,
        })
        .from(federation_referrals)
        .where(eq(federation_referrals.enabled, true))
        .orderBy(federation_referrals.sortOrder);

      response.referrals = referralRows.map((r) => ({
        identifier: r.identifier,
        displayName: r.displayName,
        type: r.type,
        url: r.url,
        description: r.description ?? undefined,
      }));
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(response, null, 2));
  },
});
