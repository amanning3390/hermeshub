/**
 * GET /api/v1/.well-known/capabilities — public ARD capability registry root.
 *
 * No auth. Emits the full work-capability registry as JSON-LD via `ard.ts`.
 * Qualifiers are excluded from the discovery root (they modify capabilities
 * rather than being remunerable units). Served as `application/ld+json`.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.ts";
import { capabilities } from "../../../shared/schema.ts";
import { withHandler } from "../../_lib/http.ts";
import { buildCapabilityRegistry } from "../../_lib/ard.ts";
import { defaultBaseHost } from "../../_lib/url.ts";

export default withHandler({
  GET: async ({ res }) => {
    const db = getDb();
    const rows = await db
      .select({
        uri: capabilities.uri,
        domain: capabilities.domain,
        displayName: capabilities.displayName,
        description: capabilities.description,
        isQualifier: capabilities.isQualifier,
        exampleQueries: capabilities.exampleQueries,
        synonyms: capabilities.synonyms,
      })
      .from(capabilities)
      .where(eq(capabilities.isQualifier, false))
      .orderBy(capabilities.uri);

    const registry = buildCapabilityRegistry(defaultBaseHost(), rows);

    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(JSON.stringify(registry, null, 2));
  },
});
