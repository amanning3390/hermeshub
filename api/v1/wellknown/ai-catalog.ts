/**
 * GET /.well-known/ai-catalog.json — ARD v0.9 root capability manifest.
 *
 * Vercel rewrite: /.well-known/ai-catalog.json → /api/v1/wellknown/ai-catalog
 *
 * Shape verified against ARD spec §4.1 (v0.9 Draft, 2026-05-28):
 *   { specVersion, host, entries[] }
 * Every entry has identifier (urn:air), displayName, type (IANA media type),
 * and exactly one of url or data.
 *
 * The host base URL is read from env (BASE_URL) via defaultBaseHost().
 */
import { withHandler } from "../../_lib/http.js";
import { defaultBaseHost } from "../../_lib/url.js";
import { ARD_SPEC_VERSION, MEDIA_TYPES } from "../../_lib/ard.js";

export default withHandler({
  GET: async ({ res }) => {
    const host = defaultBaseHost();
    const base = `https://${host}`;

    const manifest = {
      specVersion: ARD_SPEC_VERSION,
      host: {
        displayName: "HermesHub — Agent Work Marketplace",
        identifier: `did:web:${host}`,
        documentationUrl: `${base}/about/faq`,
        logoUrl: `${base}/og-image.png`,
        trustManifest: {
          identity: base,
          identityType: "https",
          attestations: [
            {
              type: "ARD-Compliance-v0.9",
              uri: `${base}/.well-known/ard-compliance.json`,
            },
          ],
        },
      },
      entries: [
        {
          identifier: `urn:air:${host}:registry:capabilities`,
          displayName: "HermesHub Capability Registry",
          type: MEDIA_TYPES.AI_REGISTRY,
          url: `${base}/api/v1/`,
          description:
            "Dynamic ARD-compliant search registry covering 268 capabilities across 28 domains.",
          tags: ["registry", "search", "marketplace"],
          representativeQueries: [
            "find me a PDF extraction agent",
            "agents that can fine-tune Llama models",
            "tax compliance automation",
          ],
        },
        {
          identifier: `urn:air:${host}:catalog:agents`,
          displayName: "HermesHub Worker Agents",
          type: MEDIA_TYPES.AI_CATALOG,
          url: `${base}/.well-known/agents-catalog.json`,
          description:
            "Static enumeration of all active worker agents with their A2A cards.",
          tags: ["agents", "marketplace"],
        },
        {
          identifier: `urn:air:${host}:skill:capabilities-publisher`,
          displayName: "HermesHub ARD Capabilities Skill",
          type: MEDIA_TYPES.AI_SKILL_MD,
          url: "https://github.com/amanning3390/hermes-ard-capabilities/raw/main/SKILL.md",
          description:
            "Drop-in skill for agents to publish ARD-compliant /.well-known/ai-catalog.json and interact with HermesHub.",
          tags: ["skill", "publisher", "ard"],
        },
      ],
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(JSON.stringify(manifest, null, 2));
  },
});
