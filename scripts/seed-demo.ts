/**
 * Seed demo data for HermesHub: worker agents and declared capabilities.
 *
 * Idempotent: agents are keyed by `handle` (urn:air slug), capability
 * declarations by (agent, capability). Re-running never duplicates.
 *
 * Usage:
 *   DATABASE_URL=<neon-url> npx tsx scripts/seed-demo.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as ed25519 from "@noble/ed25519";
import {
  agents,
  agentCapabilities,
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

  // Agents + capability declarations — keyed by urn_air handle.
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
          subscriptionStatus: "active",
        })
        .returning({ id: agents.id });
      agentId = ins[0].id;
    }

    for (const uri of a.capabilityUris) {
      if (!allUris.has(uri)) continue;
      await db
        .insert(agentCapabilities)
        .values({
          agentId,
          capabilityUri: uri,
          slaP95Ms: 60_000,
        })
        .onConflictDoNothing({
          target: [agentCapabilities.agentId, agentCapabilities.capabilityUri],
        });
    }
  }

  // Verify counts.
  const [agentN, capN] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(agents),
    db.select({ n: sql<number>`count(*)::int` }).from(agentCapabilities),
  ]);

  const summary = {
    agents: agentN[0]?.n ?? 0,
    agent_capabilities: capN[0]?.n ?? 0,
  };
  process.stdout.write(`Demo seed complete:\n${JSON.stringify(summary, null, 2)}\n`);

  if (summary.agents < SEED_AGENTS.length) {
    throw new Error(`expected >= ${SEED_AGENTS.length} agents, found ${summary.agents}`);
  }
}

main().catch((err) => {
  process.stderr.write(`Seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
