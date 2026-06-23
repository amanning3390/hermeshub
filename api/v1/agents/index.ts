/**
 * GET /api/v1/agents — agent directory with ARD-compliant cursor pagination.
 *
 * Filters: `?capability=hct:video:edit:short-form` (declared by the agent),
 * `?domain=video` (any declared capability in that domain), `?q=` (name /
 * urn_air / handle / owner substring).
 *
 * Pagination: `?pageSize=N&pageToken=<base64>` (default 10, max 100).
 * pageToken is a base64-encoded JSON { page: N }.
 * Falls back to `?limit=&offset=` for backward compat.
 *
 * Per ARD spec §7.4, orderBy defaults to name ASC.
 */
import { and, eq, or, ilike, inArray, sql } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { agents, agentCapabilities, capabilities } from "../../../shared/schema.js";
import { withHandler, sendOk, param, intParam } from "../../_lib/http.js";

function decodePageToken(token: string | null | undefined): number {
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

export default withHandler({
  GET: async ({ req, res }) => {
    const db = getDb();
    const capability = param(req, "capability");
    const domain = param(req, "domain");
    const q = param(req, "q");

    // Support both pageToken cursor (ARD spec §7.4) and legacy limit/offset.
    const pageToken = param(req, "pageToken");
    const rawPageSize = param(req, "pageSize");
    const pageSize = rawPageSize
      ? Math.min(100, Math.max(1, parseInt(rawPageSize, 10) || 10))
      : intParam(req, "limit", 10, 100);

    const page = decodePageToken(pageToken);
    // Legacy offset param overrides page token.
    const rawOffset = param(req, "offset");
    const off = rawOffset ? Math.max(0, parseInt(rawOffset, 10) || 0) : page * pageSize;

    const conditions = [];

    // Restrict to agents that declare a matching capability / domain.
    if (capability || domain) {
      const capConds = [];
      if (capability) capConds.push(eq(agentCapabilities.capabilityUri, capability));
      if (domain) capConds.push(eq(capabilities.domain, domain));
      const matching = await db
        .selectDistinct({ agentId: agentCapabilities.agentId })
        .from(agentCapabilities)
        .innerJoin(capabilities, eq(capabilities.uri, agentCapabilities.capabilityUri))
        .where(and(...capConds));
      const ids = matching.map((r) => r.agentId);
      if (ids.length === 0) {
        sendOk(res, { agents: [], total: 0, pageSize, offset: off });
        return;
      }
      conditions.push(inArray(agents.id, ids));
    }

    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(agents.name, like),
          ilike(agents.urnAir, like),
          ilike(agents.handle, like),
          ilike(agents.ownerGithub, like),
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: agents.id,
        agentId: agents.agentId,
        urnAir: agents.urnAir,
        handle: agents.handle,
        publisherDomain: agents.publisherDomain,
        name: agents.name,
        bio: agents.bio,
        model: agents.model,
        ownerGithub: agents.ownerGithub,
        verified: agents.verified,
        trustScore: agents.trustScore,
        updatedAt: agents.updatedAt,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(where)
      .orderBy(sql`${agents.trustScore} DESC`, agents.createdAt)
      .limit(pageSize)
      .offset(off);

    const countRows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(agents)
      .where(where);

    const total = countRows[0]?.n ?? 0;
    const nextPage = off + pageSize < total ? page + 1 : null;

    sendOk(res, {
      agents: rows,
      total,
      pageSize,
      offset: off,
      nextPageToken: nextPage !== null ? encodePageToken(nextPage) : undefined,
    });
  },
});
