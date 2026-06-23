/**
 * GET /api/v1/capabilities — list the capability registry.
 *
 * Filters: `?domain=video` (exact domain), `?q=edit` (substring over uri /
 * display name / synonyms), `?qualifiers=true|false|all` (default: work caps
 * only). Paginated via `?limit=` (default 100, max 500) + `?offset=`.
 */
import { and, eq, or, ilike, sql } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { capabilities } from "../../../shared/schema.js";
import { withHandler, sendOk, param, intParam } from "../../_lib/http.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const db = getDb();
    const domain = param(req, "domain");
    const q = param(req, "q");
    const qualifiers = param(req, "qualifiers") ?? "false";
    const limit = intParam(req, "limit", 100, 500);
    const off = Math.max(0, Number.parseInt(param(req, "offset") ?? "0", 10) || 0);

    const conditions = [];
    if (qualifiers === "false") conditions.push(eq(capabilities.isQualifier, false));
    else if (qualifiers === "true") conditions.push(eq(capabilities.isQualifier, true));
    if (domain) conditions.push(eq(capabilities.domain, domain));
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(capabilities.uri, like),
          ilike(capabilities.displayName, like),
          sql`EXISTS (SELECT 1 FROM unnest(${capabilities.synonyms}) s WHERE s ILIKE ${like})`,
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(capabilities)
      .where(where)
      .orderBy(capabilities.uri)
      .limit(limit)
      .offset(off);

    const countRows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(capabilities)
      .where(where);

    sendOk(res, { capabilities: rows, total: countRows[0]?.n ?? 0, limit, offset: off });
  },
});
