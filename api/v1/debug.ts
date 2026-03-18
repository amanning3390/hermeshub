/**
 * GET /api/v1/debug - V5 inline schema test
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }

    const sql = neon(url);
    const db = drizzle(sql);
    const aggregates = await db.select().from(feedbackAggregates);

    const totalReviews = aggregates.reduce((s, a) => s + a.reviewCount, 0);
    const skillsReviewed = aggregates.filter(a => a.reviewCount > 0).length;

    res.json({
      status: "ok",
      total_reviews: totalReviews,
      skills_reviewed: skillsReviewed,
      aggregate_count: aggregates.length,
    });
  } catch (e: any) {
    res.status(500).json({
      status: "error",
      error: e.message,
      stack: e.stack?.split("\n").slice(0, 5),
    });
  }
}
