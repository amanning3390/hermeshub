/**
 * GET /.well-known/hermes-capabilities — Hermes-specific capability registry.
 *
 * Not part of the ARD spec; a HermesHub extension at the well-known path.
 * Vercel rewrite: /.well-known/hermes-capabilities → /api/v1/wellknown/capabilities
 *
 * Emits the HCT (Hermes Capability Taxonomy) as a flat JSON object.
 * Qualifiers are excluded from the discovery root (they modify capabilities
 * rather than being remunerable units).
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { capabilities } from "../../../shared/schema.js";
import { withHandler } from "../../_lib/http.js";
import { buildCapabilityRegistry } from "../../_lib/ard.js";
import { defaultBaseHost } from "../../_lib/url.js";

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

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(JSON.stringify(registry, null, 2));
  },
});
