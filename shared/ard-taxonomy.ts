/**
 * Hermes Capability Taxonomy (HCT v1) — the canonical 28-domain capability tree.
 *
 * Authoritative domain set: the build brief's 28 domains. Verb/object detail is
 * drawn from plan §3's HCT v1 where domains overlap, and authored fresh for the
 * two brief-only domains (`comm`, `analytics`). Format is
 * `<domain>:<verb>:<object>`, emitted with the `hct:` namespace prefix so URIs
 * read e.g. `hct:video:edit:short-form`.
 *
 * The tree below is authored compactly (domain → verb → object leaves).
 * `buildTaxonomy()` flattens it to one capability row per **object leaf** — the
 * remunerable, matchable units of work (~280 total). Domain and verb levels are
 * exposed structurally via the `domain` column and the `parentUri` chain so the
 * UI can still group leaves, but only leaves are seeded as discrete capabilities.
 *
 * Qualifier dimensions (gpu, geo, lang, …) live in the `hctq:` namespace with
 * `isQualifier = true` and are seeded separately so they never collide with work
 * capabilities.
 */

export const HCT_NAMESPACE = "hct";
export const HCT_QUALIFIER_NAMESPACE = "hctq";
export const HCT_SPEC_VERSION = "v1";

/** The 28 authoritative domains (brief order). */
export const DOMAIN_ORDER = [
  "video",
  "audio",
  "image",
  "3d",
  "design",
  "writing",
  "seo",
  "marketing",
  "ads",
  "social",
  "sales",
  "cx",
  "finance",
  "legal",
  "hr",
  "edu",
  "translate",
  "transcribe",
  "qa-human",
  "admin",
  "agentops",
  "realworld",
  "code",
  "research",
  "data",
  "ops",
  "comm",
  "analytics",
] as const;

export type DomainId = (typeof DOMAIN_ORDER)[number];

/** domain → { verb → object[] } */
export interface DomainSpec {
  domain: DomainId;
  displayName: string;
  description: string;
  verbs: Record<string, string[]>;
}

export const DOMAINS: DomainSpec[] = [
  /* -------------------------------- Creative -------------------------------- */
  {
    domain: "video",
    displayName: "Video",
    description: "Generate, edit, and distribute video content.",
    verbs: {
      generate: ["text-to-video", "avatar"],
      edit: ["short-form", "color-grade", "captions"],
      transcribe: ["subtitle"],
      youtube: ["optimize-meta", "thumbnail"],
      animation: ["motion-graphics", "explainer"],
      "b-roll": ["source"],
    },
  },
  {
    domain: "audio",
    displayName: "Audio",
    description: "Generate, edit, and master audio.",
    verbs: {
      generate: ["music", "sfx"],
      edit: ["denoise", "master"],
      "voice-clone": ["tts"],
      podcast: ["mix", "show-notes", "chapter-marks"],
      "translate-dub": ["multilingual"],
      audiobook: ["narrate"],
    },
  },
  {
    domain: "image",
    displayName: "Image",
    description: "Generate, edit, and retouch images.",
    verbs: {
      generate: ["text-to-image", "product-shot"],
      edit: ["inpaint", "upscale", "bg-remove"],
      photo: ["retouch", "headshot"],
      logo: ["concept", "variations"],
      illustration: ["vector"],
    },
  },
  {
    domain: "3d",
    displayName: "3D",
    description: "Model, texture, rig, and render 3D assets.",
    verbs: {
      model: ["hard-surface", "character"],
      texture: ["pbr"],
      rig: ["skeletal"],
      animate: ["keyframe", "mocap"],
      render: ["product-viz", "archviz"],
      printable: ["repair"],
      cad: ["parametric"],
    },
  },
  {
    domain: "design",
    displayName: "Design",
    description: "UI, UX, brand, and graphic design.",
    verbs: {
      ui: ["web", "mobile"],
      ux: ["wireframe", "prototype"],
      brand: ["identity-system", "guidelines"],
      graphic: ["poster", "banner"],
      presentation: ["deck-design"],
      system: ["figma-library", "tokens"],
    },
  },
  {
    domain: "writing",
    displayName: "Writing",
    description: "Longform, copy, creative, and editing.",
    verbs: {
      longform: ["blog", "whitepaper"],
      copy: ["landing", "ad", "email"],
      creative: ["fiction", "screenplay"],
      ghostwrite: ["newsletter"],
      edit: ["line", "proof"],
      naming: ["brand"],
    },
  },

  /* ----------------------------- Growth & mktg ----------------------------- */
  {
    domain: "seo",
    displayName: "SEO",
    description: "Search and answer-engine optimization.",
    verbs: {
      audit: ["technical", "content"],
      keyword: ["research", "cluster"],
      onpage: ["meta", "schema-jsonld"],
      technical: ["core-web-vitals", "sitemap"],
      link: ["build-outreach"],
      "llm-seo": ["answer-engine-rank"],
      monitor: ["rank-track"],
    },
  },
  {
    domain: "marketing",
    displayName: "Marketing",
    description: "Campaigns, lifecycle, PR, and community.",
    verbs: {
      campaign: ["plan", "launch"],
      brand: ["positioning", "messaging-house"],
      funnel: ["attribution"],
      lifecycle: ["nurture", "winback"],
      pr: ["pitch-press"],
      community: ["ambassador-program"],
    },
  },
  {
    domain: "ads",
    displayName: "Advertising",
    description: "Paid media across networks.",
    verbs: {
      google: ["search", "pmax"],
      meta: ["advantage-plus"],
      tiktok: ["spark"],
      creative: ["variant-test"],
      "landing-page": ["ab-test"],
      attribution: ["incrementality"],
      audience: ["lookalike"],
    },
  },
  {
    domain: "social",
    displayName: "Social",
    description: "Social-media strategy, posting, and community.",
    verbs: {
      strategy: ["content-pillar", "calendar"],
      post: ["multi-channel"],
      schedule: ["queue"],
      community: ["dm-triage", "engage"],
      influencer: ["sourcing"],
      trend: ["jack-the-trend"],
    },
  },

  /* ------------------------------ Commercial ------------------------------- */
  {
    domain: "sales",
    displayName: "Sales",
    description: "Prospecting, outbound, and CRM hygiene.",
    verbs: {
      prospect: ["icp", "enrich"],
      outbound: ["cold-email", "sequence"],
      call: ["summarize", "coach"],
      proposal: ["draft"],
      crm: ["hygiene"],
      forecast: ["pipeline"],
    },
  },
  {
    domain: "cx",
    displayName: "Customer Experience",
    description: "Support, knowledge base, and success.",
    verbs: {
      ticket: ["triage", "route"],
      response: ["draft", "macro"],
      kb: ["write", "gap-analysis"],
      churn: ["predict"],
      success: ["health-score"],
    },
  },
  {
    domain: "finance",
    displayName: "Finance",
    description: "Bookkeeping, FP&A, tax, and treasury.",
    verbs: {
      bookkeeping: ["categorize", "reconcile"],
      invoice: ["generate", "dunning"],
      tax: ["estimate", "file-prep"],
      fpa: ["model", "forecast"],
      crypto: ["cost-basis"],
      investor: ["update"],
    },
  },
  {
    domain: "legal",
    displayName: "Legal",
    description: "Contracts, entity formation, IP, and privacy.",
    verbs: {
      contract: ["review", "redline"],
      nda: ["triage"],
      entity: ["form"],
      trademark: ["search"],
      privacy: ["policy", "gdpr"],
      employment: ["offer-letter"],
    },
  },
  {
    domain: "hr",
    displayName: "Human Resources",
    description: "Hiring, onboarding, and people analytics.",
    verbs: {
      jd: ["write"],
      source: ["candidate"],
      screen: ["resume", "take-home-grade"],
      interview: ["kit", "rubric"],
      offer: ["comp-band-research"],
      "people-analytics": ["attrition"],
    },
  },

  /* --------------------------- Knowledge & loop ---------------------------- */
  {
    domain: "edu",
    displayName: "Education",
    description: "Tutoring, courses, and assessment.",
    verbs: {
      tutor: ["k12", "professional"],
      course: ["outline", "lesson"],
      curriculum: ["design"],
      assessment: ["rubric"],
      grading: ["essay", "code"],
    },
  },
  {
    domain: "translate",
    displayName: "Translation",
    description: "Document, software, and media localization.",
    verbs: {
      doc: ["general", "legal", "technical"],
      website: ["i18n-extract"],
      software: ["i18n-strings"],
      media: ["subtitle", "dub"],
      localize: ["idiom"],
    },
  },
  {
    domain: "transcribe",
    displayName: "Transcription",
    description: "Audio, video, meeting, and specialist transcription.",
    verbs: {
      audio: ["verbatim", "timestamped", "clean-read"],
      video: ["speaker-labels", "scene-marker"],
      meeting: ["zoom", "teams", "gmeet"],
      medical: ["soap"],
      legal: ["deposition", "court"],
      realtime: ["live-captions"],
    },
  },
  {
    domain: "qa-human",
    displayName: "Human QA",
    description: "Human review, labeling, and moderation.",
    verbs: {
      review: ["image", "text", "audio", "video"],
      label: ["bbox", "segmentation", "classification", "relevance"],
      "red-team": ["manual-jailbreak", "refusal-probe"],
      rating: ["preference", "helpfulness"],
      moderation: ["hate-speech", "spam"],
    },
  },

  /* ------------------------------ Operational ------------------------------ */
  {
    domain: "admin",
    displayName: "Administration",
    description: "Scheduling, inbox, travel, and data entry.",
    verbs: {
      scheduling: ["meet-coord", "calendly"],
      "email-triage": ["inbox-zero", "filter-rules"],
      travel: ["book", "expense"],
      summary: ["daily-brief", "weekly-roundup"],
      "data-entry": ["spreadsheet", "form"],
      "file-org": ["notion"],
      shopping: ["compare", "procure"],
    },
  },
  {
    domain: "agentops",
    displayName: "Agent Operations",
    description: "Registry, eval harness, sandboxes, and telemetry.",
    verbs: {
      registry: ["publish-card"],
      "eval-harness": ["build", "run"],
      sandbox: ["containerize"],
      guardrails: ["output-filter"],
      mcp: ["server-build"],
      telemetry: ["otel-instrument"],
    },
  },

  /* ------------------------------- Real-world ------------------------------ */
  {
    domain: "realworld",
    displayName: "Real-World",
    description: "Procurement, logistics, real estate, and local services.",
    verbs: {
      procurement: ["rfq", "vendor-eval"],
      travel: ["itinerary"],
      logistics: ["shipping"],
      "local-services": ["contractor-bid-collect"],
      realestate: ["comp"],
      "property-mgmt": ["tenant-screen", "lease-draft"],
      permits: ["application-draft"],
    },
  },

  /* ----------------------------- Technical core ---------------------------- */
  {
    domain: "code",
    displayName: "Code",
    description: "Write, fix, review, and refactor software.",
    verbs: {
      write: ["feature", "library", "sdk"],
      fix: ["bug", "regression"],
      review: ["pr", "security"],
      refactor: ["module"],
      test: ["unit", "e2e"],
      api: ["design", "openapi"],
      migration: ["framework"],
    },
  },
  {
    domain: "research",
    displayName: "Research",
    description: "Literature review, market sizing, and patents.",
    verbs: {
      paper: ["summarize", "replicate"],
      "literature-review": ["synthesis"],
      "competitive-scan": ["landscape"],
      "market-sizing": ["tam-sam-som"],
      patent: ["search"],
      survey: ["analyze"],
    },
  },
  {
    domain: "data",
    displayName: "Data",
    description: "Collect, label, clean, synthesize, and pipeline data.",
    verbs: {
      collect: ["web", "api"],
      label: ["human", "llm"],
      dedupe: ["semantic"],
      synthesize: ["instruct"],
      extract: ["pdf", "vision", "ocr"],
      transform: ["schema"],
      pipeline: ["dagster"],
    },
  },
  {
    domain: "ops",
    displayName: "Operations",
    description: "Deploy, monitor, and run infrastructure.",
    verbs: {
      deploy: ["vercel", "k8s"],
      monitor: ["datadog", "sentry"],
      "cost-optimize": ["cloud"],
      iac: ["terraform"],
      ci: ["github-actions"],
      incident: ["postmortem"],
    },
  },

  /* -------------------------- Brief-only domains --------------------------- */
  {
    domain: "comm",
    displayName: "Communications",
    description: "Internal and external communications, messaging, and outreach.",
    verbs: {
      announce: ["internal-memo", "press-release"],
      meeting: ["agenda", "minutes"],
      brief: ["exec-summary"],
      crisis: ["statement"],
      newsletter: ["draft"],
      speech: ["talking-points"],
    },
  },
  {
    domain: "analytics",
    displayName: "Analytics",
    description: "Reporting, dashboards, experimentation, and insight generation.",
    verbs: {
      report: ["kpi-pack", "weekly"],
      dashboard: ["build"],
      experiment: ["ab-test", "readout"],
      cohort: ["retention"],
      attribution: ["channel"],
      insight: ["narrative"],
    },
  },
];

/** Qualifier dimensions (`isQualifier = true`, `hctq:` namespace). Plan §3. */
export const QUALIFIERS: Record<string, string[]> = {
  gpu: ["a100", "h100", "h200", "b200", "mi300", "l40s", "rtx-4090", "rtx-5090", "mac-m-series"],
  compute: ["cpu-only", "edge", "mobile-on-device"],
  geo: ["us", "ca", "eu", "uk", "apac", "latam", "mena", "africa", "in", "jp", "cn"],
  lang: ["en", "es", "fr", "de", "ja", "zh", "ko", "pt", "hi", "ar"],
  latency: ["realtime", "interactive", "batch", "overnight"],
  scale: ["solo", "team", "enterprise", "hyperscale"],
  license: ["mit", "apache-2", "gpl", "proprietary", "cc-by", "cc-by-sa", "cc0"],
  platform: ["youtube", "tiktok", "instagram", "x", "linkedin", "reddit", "facebook", "threads", "bluesky", "mastodon"],
  vertical: ["ecommerce", "saas", "fintech", "healthtech", "edtech", "gaming", "media", "b2b", "dtc", "marketplace", "creator"],
  "safety-tier": ["sfw", "adult-allowed", "regulated"],
};

/** A flattened capability node ready for insertion into the `capabilities` table. */
export interface CapabilityNode {
  uri: string;
  parentUri: string | null;
  domain: string;
  leaf: string;
  displayName: string;
  description: string;
  isQualifier: boolean;
  exampleQueries: string[];
  synonyms: string[];
}

function titleize(slug: string): string {
  return slug
    .split(/[-:]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Flatten the tree into the leaf-level capability rows that get seeded.
 *
 * Returns one row per object leaf (`hct:<domain>:<verb>:<object>`) — the
 * remunerable, matchable units. Each leaf carries the structural `parentUri`
 * (`hct:<domain>:<verb>`) and `domain` for grouping, ≥2 example queries, and ≥3
 * synonyms (plan §3 "Counts"). Domain and verb levels are not seeded as separate
 * rows; they are reconstructable from the leaf URIs.
 */
export function buildTaxonomy(): CapabilityNode[] {
  const nodes: CapabilityNode[] = [];

  for (const spec of DOMAINS) {
    const domainUri = `${HCT_NAMESPACE}:${spec.domain}`;
    for (const [verb, objects] of Object.entries(spec.verbs)) {
      const verbUri = `${domainUri}:${verb}`;
      const verbLabel = titleize(verb);
      for (const object of objects) {
        const objLabel = titleize(object);
        nodes.push({
          uri: `${verbUri}:${object}`,
          parentUri: verbUri,
          domain: spec.domain,
          leaf: object,
          displayName: `${spec.displayName} — ${verbLabel}: ${objLabel}`,
          description: `${verbLabel} ${objLabel} (${spec.domain}:${verb}:${object}).`,
          isQualifier: false,
          exampleQueries: [
            `${verb} ${object} ${spec.domain}`,
            `${objLabel.toLowerCase()} ${verbLabel.toLowerCase()}`,
          ],
          synonyms: [object, `${verb} ${object}`, objLabel.toLowerCase()],
        });
      }
    }
  }

  return nodes;
}

/** Flatten the qualifier dimensions into leaf rows (`hctq:<dimension>:<value>`). */
export function buildQualifiers(): CapabilityNode[] {
  const nodes: CapabilityNode[] = [];
  for (const [dimension, values] of Object.entries(QUALIFIERS)) {
    const dimUri = `${HCT_QUALIFIER_NAMESPACE}:${dimension}`;
    for (const value of values) {
      nodes.push({
        uri: `${dimUri}:${value}`,
        parentUri: dimUri,
        domain: dimension,
        leaf: value,
        displayName: `${titleize(dimension)}: ${titleize(value)}`,
        description: `${titleize(value)} (${dimension} qualifier).`,
        isQualifier: true,
        exampleQueries: [`${dimension} ${value}`, `${value} ${dimension}`],
        synonyms: [value, `${dimension}:${value}`, titleize(value).toLowerCase()],
      });
    }
  }
  return nodes;
}

/** Count of work-capability leaf nodes (object level, non-qualifier). */
export function leafCount(): number {
  return DOMAINS.reduce(
    (sum, d) => sum + Object.values(d.verbs).reduce((s, objs) => s + objs.length, 0),
    0,
  );
}
