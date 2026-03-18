/**
 * GET /api/v1/feedback/score/:skill
 * Get just the aggregate trust score badge for a skill.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb } from "../../../_lib/db";
import { feedbackAggregates } from "../../../_lib/schema";
import { setCors } from "../../../_lib/cors";

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
