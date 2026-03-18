/**
 * GET /api/v1/feedback/stats
 * Global feedback stats across all skills.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../_lib/db";
import { feedbackAggregates } from "../../_lib/schema";
import { setCors } from "../../_lib/cors";

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
