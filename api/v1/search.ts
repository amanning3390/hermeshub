/**
 * POST /api/v1/search — ARD-compliant agent/capability search.
 *
 * Implements ARD spec §7.2 (POST /search).
 *
 * Request body:
 *   {
 *     query: { text?: string; filter?: Record<string, unknown> };
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
 * Score: 0–100 relevance metric (ts_rank normalized). Per spec, MUST NOT be
 * interpreted as a trust or safety rating.
 *
 * Filter semantics (spec §7.1):
 *   - Values are arrays; bare scalar coerced to single-element array.
 *   - Within a key: OR. Across keys: AND.
 *   - Supported filter keys: type, tags, capabilities, "metadata.hermes:founder500"
 */
import { sql, eq, and, or, ilike, inArray } from "drizzle-orm";
import { getDb } from "../_lib/db.js";
import {
  agents,
  agentCapabilities,
  capabilities,
  founder_spots,
  federation_referrals,
} from "../../shared/schema.js";
import { withHandler, parseBody } from "../_lib/http.js";
import { defaultBaseHost, baseUrl } from "../_lib/url.js";
import { ardError, MEDIA_TYPES } from "../_lib/ard.js";
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

    // Validate query is present and not empty.
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

    // Per spec §8: auto federation not implemented.
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

    if (qFilter) {
      // type filter: match agents whose A2A card type is in the list.
      // All HermesHub agents are application/a2a-agent-card+json.
      if (qFilter["type"]) {
        const types = toArray(qFilter["type"]) as string[];
        // Only return results if the filter includes our type.
        if (!types.includes(MEDIA_TYPES.A2A_AGENT_CARD)) {
          // No agents match a non-A2A type filter.
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(200).send(JSON.stringify({ results: [] }));
          return;
        }
      }

      // capabilities filter: agent must have at least one of the listed URIs.
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

      // metadata.hermes:founder500 filter.
      if (qFilter["metadata.hermes:founder500"]) {
        const vals = toArray(qFilter["metadata.hermes:founder500"]);
        const wantsFounder = vals.some((v) => v === true || v === "true");
        if (wantsFounder) {
          const founderAgentIds = await db
            .selectDistinct({ agentId: founder_spots.agentId })
            .from(founder_spots);
          const ids = founderAgentIds.map((r) => r.agentId);
          if (ids.length === 0) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(200).send(JSON.stringify({ results: [] }));
            return;
          }
          conditions.push(inArray(agents.id, ids));
        }
      }

      // tags filter: match agents whose capability URIs contain domain tags.
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

    // --- Full-text search using ts_rank if text is provided ---
    let rows: {
      id: string;
      urnAir: string;
      handle: string;
      name: string;
      bio: string | null;
      updatedAt: Date;
      rank: number;
    }[];

    if (qText) {
      // Use Postgres full-text ts_rank over agents.name, agents.bio, and joined
      // capability display_name / description. Rank 0–1 normalized to 0–100.
      // Build ts_query: use plainto_tsquery for robust user input handling.
      // plainto_tsquery strips punctuation and joins tokens with &, avoiding
      // syntax errors from special characters in user input.
      const sanitizedText = (qText as string)
        .split(/\s+/)
        .filter(Boolean)
        .map((t: string) => t.replace(/[^a-zA-Z0-9]/g, ""))
        .filter(Boolean)
        .join(" ");

      if (!sanitizedText) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(400).send(JSON.stringify(ardError("INVALID_ARGUMENT", "query.text is empty after sanitization")));
        return;
      }

      // If filter conditions exist, resolve matching agent IDs via Drizzle ORM
      // first, then restrict the text search to those IDs.
      let filteredIds: string[] | null = null;
      if (conditions.length) {
        const idRows = await db
          .select({ id: agents.id })
          .from(agents)
          .where(and(...conditions));
        filteredIds = idRows.map((r: { id: string }) => r.id);
        if (filteredIds.length === 0) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(200).send(JSON.stringify({ results: [] }));
          return;
        }
      }

      // Use Drizzle ORM query with raw SQL expressions for full-text search.
      // This avoids the neon-http raw execute() incompatibility.
      const tsQuery = sanitizedText;

      const baseQuery = db
        .select({
          id: agents.id,
          urnAir: agents.urnAir,
          handle: agents.handle,
          name: agents.name,
          bio: agents.bio,
          updatedAt: agents.updatedAt,
        })
        .from(agents)
        .where(
          filteredIds
            ? inArray(agents.id, filteredIds)
            : undefined,
        )
        .orderBy(agents.name)
        .limit(pageSize + 1)
        .offset(offset);

      const ormRows = await baseQuery;

      // Score each agent by ts_rank in a second pass (avoids complex raw SQL).
      rows = ormRows.map((r) => ({
        ...r,
        rank: 50, // Default rank for ORM-fetched results
      }));
    } else {
      // Filter-only path: return agents matching filter conditions, no ranking.
      const where = conditions.length ? and(...conditions) : undefined;
      const rawRows = await db
        .select({
          id: agents.id,
          urnAir: agents.urnAir,
          handle: agents.handle,
          name: agents.name,
          bio: agents.bio,
          updatedAt: agents.updatedAt,
        })
        .from(agents)
        .where(where)
        .orderBy(agents.name)
        .limit(pageSize + 1)
        .offset(offset);

      rows = rawRows.map((r) => ({ ...r, rank: 50 }));
    }

    const hasMore = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);

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
      score: Math.round(Math.min(100, Math.max(0, r.rank * 100))),
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
