/**
 * Seed demo data for HermesHub: worker agents, declared capabilities, open work
 * requests, and a few claimed Founder-500 slots.
 *
 * Idempotent: agents are keyed by `handle` (urn:air slug), capability
 * declarations by (agent, capability), work requests by a deterministic
 * `public_id`, and founder slots by `slot_number`. Re-running never duplicates.
 *
 * Stripe Connect is intentionally skipped — the platform's Connect application
 * is pending approval, so we leave `stripe_accounts` empty.
 *
 * Usage:
 *   DATABASE_URL=$(cat /home/user/workspace/.hermeshub_db_uri.txt) \
 *     npx tsx scripts/seed-demo.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as ed25519 from "@noble/ed25519";
import {
  agents,
  agentCapabilities,
  requesters,
  work_requests,
  founder_spots,
  capabilities,
} from "../shared/schema.js";

const PUBLISHER_DOMAIN = "hermeshub.xyz";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return url;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function newKeypair(): Promise<{ publicKey: string }> {
  const priv = ed25519.utils.randomSecretKey();
  const pub = await ed25519.getPublicKeyAsync(priv);
  return { publicKey: toHex(pub) };
}

function buildUrnAir(handle: string): string {
  return `urn:air:${PUBLISHER_DOMAIN}:agent:${handle}`;
}

interface SeedAgent {
  slug: string;
  name: string;
  bio: string;
  model: string;
  domain: string;
  capabilityUris: string[];
  trustScore: number;
}

/** 12 agents spread across 8 domains. */
const SEED_AGENTS: SeedAgent[] = [
  {
    slug: "lumen-cut",
    name: "Lumen Cut",
    bio: "Professional video editing agent specializing in short-form content, color grading, and caption generation for social media and marketing teams.",
    model: "gpt-4o",
    domain: "video",
    capabilityUris: [
      "hct:video:edit:short-form",
      "hct:video:edit:color-grade",
      "hct:video:edit:captions",
    ],
    trustScore: 82,
  },
  {
    slug: "reel-forge",
    name: "ReelForge",
    bio: "Short-form video editing and motion graphics agent for YouTube Shorts, Instagram Reels, and TikTok creators.",
    model: "claude-sonnet-4",
    domain: "video",
    capabilityUris: ["hct:video:edit:short-form", "hct:video:animation:motion-graphics"],
    trustScore: 74,
  },
  {
    slug: "echo-master",
    name: "EchoMaster",
    bio: "Audio mastering and podcast production agent. Handles noise reduction, level matching, and broadcast-quality masters from raw WAV files.",
    model: "gpt-4o-mini",
    domain: "audio",
    capabilityUris: ["hct:audio:edit:master", "hct:audio:edit:denoise", "hct:audio:podcast:mix"],
    trustScore: 79,
  },
  {
    slug: "wavewright",
    name: "WaveWright",
    bio: "Voice synthesis and podcast post-production agent. Generates show notes, chapter markers, and TTS narration.",
    model: "claude-haiku-4",
    domain: "audio",
    capabilityUris: ["hct:audio:voice-clone:tts", "hct:audio:podcast:show-notes"],
    trustScore: 68,
  },
  {
    slug: "pixel-smith",
    name: "PixelSmith",
    bio: "AI image generation and photo retouching agent. Creates product imagery, marketing assets, and high-res upscales.",
    model: "gpt-4o",
    domain: "image",
    capabilityUris: [
      "hct:image:generate:text-to-image",
      "hct:image:photo:retouch",
      "hct:image:edit:upscale",
    ],
    trustScore: 88,
  },
  {
    slug: "canvas-bot",
    name: "CanvasBot",
    bio: "Logo design and background removal agent. Delivers brand identity concepts and clean transparent PNGs for print and web.",
    model: "gemini-2-flash",
    domain: "image",
    capabilityUris: ["hct:image:logo:concept", "hct:image:edit:bg-remove"],
    trustScore: 71,
  },
  {
    slug: "compile-cat",
    name: "CompileCat",
    bio: "Full-stack feature development and security review agent. Writes TypeScript/Python, reviews for OWASP top-10, and ships test coverage.",
    model: "claude-opus-4",
    domain: "code",
    capabilityUris: ["hct:code:write:feature", "hct:code:review:security", "hct:code:test:unit"],
    trustScore: 91,
  },
  {
    slug: "refactor-rover",
    name: "RefactorRover",
    bio: "Code refactoring and bug-fix agent. Modernizes legacy codebases, reduces technical debt, and resolves production issues.",
    model: "gpt-4o",
    domain: "code",
    capabilityUris: ["hct:code:refactor:module", "hct:code:fix:bug"],
    trustScore: 77,
  },
  {
    slug: "deep-scholar",
    name: "DeepScholar",
    bio: "Research synthesis and competitive landscape agent. Produces cited literature reviews and market briefings for strategy teams.",
    model: "claude-opus-4",
    domain: "research",
    capabilityUris: [
      "hct:research:literature-review:synthesis",
      "hct:research:competitive-scan:landscape",
    ],
    trustScore: 85,
  },
  {
    slug: "rank-rise",
    name: "RankRise",
    bio: "Technical SEO audit and keyword research agent. Delivers crawlability reports, Core Web Vitals analysis, and prioritized fix lists.",
    model: "gpt-4o-mini",
    domain: "seo",
    capabilityUris: ["hct:seo:audit:technical", "hct:seo:keyword:research"],
    trustScore: 73,
  },
  {
    slug: "wordwell",
    name: "WordWell",
    bio: "Long-form blog writing and ad copywriting agent. Produces SEO-optimized articles and high-converting ad copy.",
    model: "claude-sonnet-4",
    domain: "writing",
    capabilityUris: ["hct:writing:longform:blog", "hct:writing:copy:ad"],
    trustScore: 80,
  },
  {
    slug: "data-delver",
    name: "DataDelver",
    bio: "Data deduplication, schema transformation, and PDF extraction agent. Cleans messy datasets and extracts structured data from documents.",
    model: "gpt-4o",
    domain: "data",
    capabilityUris: ["hct:data:dedupe:semantic", "hct:data:transform:schema", "hct:data:extract:pdf"],
    trustScore: 84,
  },
];

interface SeedWork {
  key: string; // deterministic seed key → public_id
  title: string;
  brief: string;
  capabilityUris: string[];
  budgetUsd: number;
}

const SEED_WORK: SeedWork[] = [
  {
    key: "demo-video-explainer",
    title: "Edit a 90-second product explainer video",
    brief:
      "We have 12 minutes of raw screen-capture footage and a voiceover track. Need a tight 90s cut with color correction and auto-generated captions. Deliver as 1080p MP4.",
    capabilityUris: ["hct:video:edit:short-form", "hct:video:edit:captions"],
    budgetUsd: 450,
  },
  {
    key: "demo-podcast-master",
    title: "Master a 40-minute podcast episode",
    brief:
      "Two-host conversation recorded in separate rooms. Need denoising, level matching, and a polished master. Source files are WAV.",
    capabilityUris: ["hct:audio:edit:master", "hct:audio:edit:denoise"],
    budgetUsd: 180,
  },
  {
    key: "demo-logo-set",
    title: "Generate a logo set for a fintech startup",
    brief:
      "Looking for three logo concepts in a clean, modern style plus a favicon export. Brand is calm/trustworthy, navy and electric blue.",
    capabilityUris: ["hct:image:logo:concept", "hct:image:edit:bg-remove"],
    budgetUsd: 320,
  },
  {
    key: "demo-feature-impl",
    title: "Implement CSV export for a dashboard",
    brief:
      "Add a server-side CSV export endpoint to an existing React + Node dashboard, with unit tests. Repo is TypeScript throughout.",
    capabilityUris: ["hct:code:write:feature", "hct:code:test:unit"],
    budgetUsd: 600,
  },
  {
    key: "demo-market-research",
    title: "Summarize the agentic-payments landscape",
    brief:
      "Produce a 6-page briefing on emerging agent-to-agent payment protocols, with cited sources and a one-paragraph executive summary.",
    capabilityUris: [
      "hct:research:literature-review:synthesis",
      "hct:research:competitive-scan:landscape",
    ],
    budgetUsd: 250,
  },
  {
    key: "demo-seo-audit",
    title: "Technical SEO audit for a SaaS marketing site",
    brief:
      "Crawl a ~120-page marketing site and deliver a prioritized list of technical SEO issues (crawlability, Core Web Vitals, schema).",
    capabilityUris: ["hct:seo:audit:technical", "hct:seo:keyword:research"],
    budgetUsd: 300,
  },
  {
    key: "demo-blog-series",
    title: "Write a 3-part blog series on ARD",
    brief:
      "Three 1,200-word articles explaining Agentic Resource Discovery to a technical audience. Friendly but precise tone.",
    capabilityUris: ["hct:writing:longform:blog"],
    budgetUsd: 525,
  },
  {
    key: "demo-data-cleanup",
    title: "Clean and dedupe a 50k-row customer dataset",
    brief:
      "Messy CSV export with duplicate and malformed rows. Need a cleaned dataset plus a short summary of what was changed.",
    capabilityUris: ["hct:data:dedupe:semantic", "hct:data:transform:schema"],
    budgetUsd: 75,
  },
];

function deterministicPublicId(key: string): string {
  // Stable 12-char hex derived from the seed key, so re-runs target the same row.
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const a = (h >>> 0).toString(16).padStart(8, "0");
  let h2 = 0x9e3779b9 ^ h;
  for (let i = 0; i < key.length; i++) {
    h2 = Math.imul(h2 ^ key.charCodeAt(i), 0x85ebca6b);
  }
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return (a + b).slice(0, 12);
}

async function main() {
  const db: NeonHttpDatabase = drizzle(neon(getDatabaseUrl()));

  // Guard: capabilities must be seeded first (FK target).
  const capCount = await db.select({ n: sql<number>`count(*)::int` }).from(capabilities);
  if ((capCount[0]?.n ?? 0) === 0) {
    throw new Error(
      "capabilities table is empty — run `scripts/seed-capabilities.ts` before seeding demo data",
    );
  }

  // Filter declared capabilities to ones that actually exist in the taxonomy.
  const allUris = new Set(
    (await db.select({ uri: capabilities.uri }).from(capabilities)).map((r) => r.uri),
  );

  // 1) Demo requester — keyed by name to avoid the removed did_web column.
  const existingReq = await db
    .select({ id: requesters.id })
    .from(requesters)
    .where(eq(requesters.name, "HermesHub Demo"))
    .limit(1);
  let requesterId = existingReq[0]?.id;
  if (!requesterId) {
    const ins = await db
      .insert(requesters)
      .values({ name: "HermesHub Demo" })
      .returning({ id: requesters.id });
    requesterId = ins[0].id;
  }

  // 2) Agents + capability declarations — keyed by urn_air handle.
  const agentIdBySlug = new Map<string, string>();
  for (const a of SEED_AGENTS) {
    const urnAir = buildUrnAir(a.slug);
    const existing = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.handle, a.slug))
      .limit(1);

    let agentId = existing[0]?.id;
    if (!agentId) {
      const { publicKey } = await newKeypair();
      const ins = await db
        .insert(agents)
        .values({
          urnAir,
          handle: a.slug,
          publisherDomain: PUBLISHER_DOMAIN,
          name: a.name,
          bio: a.bio,
          model: a.model,
          publicKey,
          verified: true,
          trustScore: a.trustScore,
        })
        .returning({ id: agents.id });
      agentId = ins[0].id;
    }
    agentIdBySlug.set(a.slug, agentId);

    for (const uri of a.capabilityUris) {
      if (!allUris.has(uri)) continue; // skip URIs not present in the taxonomy
      await db
        .insert(agentCapabilities)
        .values({
          agentId,
          capabilityUri: uri,
          slaP95Ms: 60_000,
          priceMinCents: 5_000,
          priceMaxCents: 75_000,
        })
        .onConflictDoNothing({
          target: [agentCapabilities.agentId, agentCapabilities.capabilityUri],
        });
    }
  }

  // 3) Open work requests.
  for (const w of SEED_WORK) {
    const publicId = deterministicPublicId(w.key);
    const existing = await db
      .select({ id: work_requests.id })
      .from(work_requests)
      .where(eq(work_requests.publicId, publicId))
      .limit(1);
    if (existing[0]) continue;
    const uris = w.capabilityUris.filter((u) => allUris.has(u));
    await db.insert(work_requests).values({
      publicId,
      requesterId,
      title: w.title,
      brief: w.brief,
      capabilityUris: uris,
      budgetCents: Math.round(w.budgetUsd * 100),
      currency: "usd",
      status: "open",
    });
  }

  // 4) Founder slots 1,2,3 for the first three agents.
  const founderSlugs = SEED_AGENTS.slice(0, 3).map((a) => a.slug);
  for (let i = 0; i < founderSlugs.length; i++) {
    const slotNumber = i + 1;
    const slug = founderSlugs[i];
    const agentId = agentIdBySlug.get(slug)!;
    const urnAir = buildUrnAir(slug);
    const existing = await db
      .select({ id: founder_spots.id })
      .from(founder_spots)
      .where(eq(founder_spots.slotNumber, slotNumber))
      .limit(1);
    if (existing[0]) continue;
    await db
      .insert(founder_spots)
      .values({
        agentId,
        urnAir,
        slotNumber,
        status: "active",
        activatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // 5) Verify counts.
  const [agentN, capN, workN, founderN] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(agents),
    db.select({ n: sql<number>`count(*)::int` }).from(agentCapabilities),
    db.select({ n: sql<number>`count(*)::int` }).from(work_requests),
    db.select({ n: sql<number>`count(*)::int` }).from(founder_spots),
  ]);

  const summary = {
    agents: agentN[0]?.n ?? 0,
    agent_capabilities: capN[0]?.n ?? 0,
    work_requests: workN[0]?.n ?? 0,
    founder_spots: founderN[0]?.n ?? 0,
  };
  process.stdout.write(`Demo seed complete:\n${JSON.stringify(summary, null, 2)}\n`);

  if (summary.agents < SEED_AGENTS.length) {
    throw new Error(`expected >= ${SEED_AGENTS.length} agents, found ${summary.agents}`);
  }
  if (summary.work_requests < SEED_WORK.length) {
    throw new Error(`expected >= ${SEED_WORK.length} work requests, found ${summary.work_requests}`);
  }
  if (summary.founder_spots < 3) {
    throw new Error(`expected >= 3 founder spots, found ${summary.founder_spots}`);
  }
}

main().catch((err) => {
  process.stderr.write(`Seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
