/**
 * GET /api/v1/feedback/score/:skill
 * Get just the aggregate trust score badge for a skill.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";

// ─── Inline DB ──────────────────────────────────────────────────────────────
let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  _db = drizzle(neon(url));
  return _db;
}

// ─── Inline Schema ──────────────────────────────────────────────────────────
const feedbackAggregates = pgTable("feedback_aggregates", {
  id: serial("id").primaryKey(),
  skillName: text("skill_name").notNull().unique(),
  reviewCount: integer("review_count").notNull().default(0),
  successRate: real("success_rate").notNull().default(0),
  avgWorksAsDescribed: real("avg_works_as_described").notNull().default(0),
  avgReliability: real("avg_reliability").notNull().default(0),
  avgDocumentation: real("avg_documentation").notNull().default(0),
  avgSafety: real("avg_safety").notNull().default(0),
  trustScore: real("trust_score").notNull().default(0),
  securityFlagCount: integer("security_flag_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// ─── Inline CORS ────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://hermeshub.xyz",
  "https://www.hermeshub.xyz",
  "http://localhost:5000",
  "http://localhost:5173",
];

function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { skill } = req.query;
    if (!skill || typeof skill !== "string") {
      return res.status(400).json({ error: "invalid_skill_name" });
    }

    const db = getDb();
    const [aggregate] = await db.select().from(feedbackAggregates)
      .where(eq(feedbackAggregates.skillName, skill));

    if (!aggregate || aggregate.reviewCount === 0) {
      return res.json({
        skill,
        status: "untested",
        trust_score: null,
        review_count: 0,
      });
    }

    let badge = "untested";
    if (aggregate.reviewCount >= 10 && aggregate.trustScore >= 80) badge = "community_verified";
    else if (aggregate.reviewCount >= 3 && aggregate.trustScore >= 60) badge = "tested";
    else if (aggregate.reviewCount >= 3 && aggregate.trustScore < 40) badge = "needs_improvement";
    else if (aggregate.reviewCount >= 1) badge = "early_feedback";

    // Cache for 60 seconds
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

    res.json({
      skill,
      status: badge,
      trust_score: aggregate.trustScore,
      review_count: aggregate.reviewCount,
      success_rate: aggregate.successRate,
      security_flags: aggregate.securityFlagCount,
      avg_ratings: {
        works_as_described: aggregate.avgWorksAsDescribed,
        reliability: aggregate.avgReliability,
        documentation: aggregate.avgDocumentation,
        safety: aggregate.avgSafety,
      },
    });
  } catch (e) {
    console.error("Score fetch error:", e);
    res.status(500).json({ error: "internal_error" });
  }
}
