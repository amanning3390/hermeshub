/**
 * GET /.well-known/ard-compliance.json — ARD compliance self-attestation.
 *
 * Vercel rewrite: /.well-known/ard-compliance.json → /api/v1/wellknown/ard-compliance
 *
 * Returns a self-described attestation JSON documenting which ARD v0.9 features
 * this registry implements. Referenced from the root ai-catalog.json trustManifest.
 */
import { withHandler } from "../../_lib/http.js";

const LAST_AUDITED = "2026-06-29T00:00:00.000Z";

export default withHandler({
  GET: async ({ res }) => {
    const compliance = {
      specVersion: "1.0",
      registry: "HermesHub",
      implements: {
        well_known_ai_catalog: true,
        search: true,
        explore: false,
        agents_listing: true,
        federation_modes: ["none", "referrals"],
        trust_manifest: "partial",
        media_types: [
          "application/a2a-agent-card+json",
          "application/ai-catalog+json",
          "application/ai-registry+json",
          "application/ai-skill+md",
        ],
      },
      spec_version: "v0.9 Draft 2026-05-28",
      spec_url: "https://agenticresourcediscovery.org/spec/",
      last_audited: LAST_AUDITED,
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(JSON.stringify(compliance, null, 2));
  },
});
