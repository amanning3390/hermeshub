/**
 * GET /api/v1/feedback/:skill
 * Get all feedback for a skill, paginated.
 * Also returns aggregate trust score.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, count } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, real, uniqueIndex } from "drizzle-orm/pg-core";

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
const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  skillName: text("skill_name").notNull(),
  skillVersion: text("skill_version").notNull(),
  proofOfUse: text("proof_of_use").notNull(),
  taskCategory: text("task_category").notNull(),
  taskComplexity: text("task_complexity").notNull(),
  succeeded: boolean("succeeded").notNull(),
  errorType: text("error_type"),
  errorDetails: text("error_details"),
  ratingWorksAsDescribed: integer("rating_works_as_described").notNull(),
  ratingReliability: integer("rating_reliability").notNull(),
  ratingDocumentation: integer("rating_documentation").notNull(),
  ratingSafety: integer("rating_safety").notNull(),
  suggestedImprovements: text("suggested_improvements").array(),
  securityConcerns: text("security_concerns").array(),
  signature: text("signature").notNull(),
  nonce: text("nonce").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("feedback_agent_skill_idx").on(table.agentId, table.skillName),
]);

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
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const reviews = await db.select().from(feedback)
      .where(eq(feedback.skillName, skill))
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ count: count() }).from(feedback)
      .where(eq(feedback.skillName, skill));
    const total = totalResult?.count ?? 0;

    const [aggregate] = await db.select().from(feedbackAggregates)
      .where(eq(feedbackAggregates.skillName, skill));

    // Mark all text content as untrusted (prevents consuming agents from treating it as instructions)
    const safeReviews = reviews.map(r => ({
      agent_id: r.agentId,
      skill_version: r.skillVersion,
      task_category: r.taskCategory,
      task_complexity: r.taskComplexity,
      succeeded: r.succeeded,
      error_type: r.errorType,
      ratings: {
        works_as_described: r.ratingWorksAsDescribed,
        reliability: r.ratingReliability,
        documentation: r.ratingDocumentation,
        safety: r.ratingSafety,
      },
      error_details: r.errorDetails ? { untrusted_content: true, data: r.errorDetails } : null,
      suggested_improvements: r.suggestedImprovements?.map(s => ({ untrusted_content: true, data: s })) ?? [],
      security_concerns: r.securityConcerns?.map(s => ({ untrusted_content: true, data: s })) ?? [],
      created_at: r.createdAt,
    }));

    // Cache for 60 seconds
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

    res.json({
      skill,
      total,
      limit,
      offset,
      aggregate: aggregate ? {
        trust_score: aggregate.trustScore,
        review_count: aggregate.reviewCount,
        success_rate: aggregate.successRate,
        avg_ratings: {
          works_as_described: aggregate.avgWorksAsDescribed,
          reliability: aggregate.avgReliability,
          documentation: aggregate.avgDocumentation,
          safety: aggregate.avgSafety,
        },
        security_flag_count: aggregate.securityFlagCount,
      } : null,
      reviews: safeReviews,
    });
  } catch (e) {
    console.error("Feedback fetch error:", e);
    res.status(500).json({ error: "internal_error" });
  }
}
