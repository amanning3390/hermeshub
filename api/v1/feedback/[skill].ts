/**
 * GET /api/v1/feedback/:skill
 * Get all feedback for a skill, paginated.
 * Also returns aggregate trust score.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc, count } from "drizzle-orm";
import { getDb } from "../../_lib/db";
import { feedback, feedbackAggregates } from "../../_lib/schema";
import { setCors } from "../../_lib/cors";

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
