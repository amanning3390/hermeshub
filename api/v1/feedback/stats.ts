/**
 * GET /api/v1/feedback/stats
 * Global feedback stats across all skills.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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
    const db = getDb();
    const aggregates = await db.select().from(feedbackAggregates);

    const totalReviews = aggregates.reduce((s, a) => s + a.reviewCount, 0);
    const skillsReviewed = aggregates.filter(a => a.reviewCount > 0).length;
    const avgTrustScore = skillsReviewed > 0
      ? aggregates.filter(a => a.reviewCount > 0).reduce((s, a) => s + a.trustScore, 0) / skillsReviewed
      : 0;

    // Cache for 5 minutes
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

    res.json({
      total_reviews: totalReviews,
      skills_reviewed: skillsReviewed,
      avg_trust_score: Math.round(avgTrustScore * 10) / 10,
      top_skills: aggregates
        .filter(a => a.reviewCount >= 3)
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, 10)
        .map(a => ({
          skill: a.skillName,
          trust_score: a.trustScore,
          review_count: a.reviewCount,
        })),
    });
  } catch (e) {
    console.error("Stats error:", e);
    res.status(500).json({ error: "internal_error" });
  }
}
