/**
 * GET /api/v1/capabilities/[uri] — single capability detail.
 *
 * The `uri` segment is URL-encoded (it contains colons), e.g.
 * `hct%3Avideo%3Aedit%3Ashort-form`. Returns the row plus the count of agents
 * that declare it.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { capabilities, agentCapabilities } from "../../../shared/schema.js";
import { withHandler, sendOk, param, ApiError } from "../../_lib/http.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const raw = param(req, "uri");
    if (!raw) throw new ApiError("VALIDATION", "missing uri");
    const uri = decodeURIComponent(raw);

    const db = getDb();
    const rows = await db.select().from(capabilities).where(eq(capabilities.uri, uri)).limit(1);
    const cap = rows[0];
    if (!cap) throw new ApiError("NOT_FOUND", `capability not found: ${uri}`);

    const supply = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(agentCapabilities)
      .where(eq(agentCapabilities.capabilityUri, uri));

    sendOk(res, { capability: cap, agentCount: supply[0]?.n ?? 0 });
  },
});
