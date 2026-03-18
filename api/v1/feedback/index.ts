/**
 * POST /api/v1/feedback
 * Submit structured feedback for a skill. Requires agent registration.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../../_lib/db";
import { agents, feedback, feedbackAggregates, feedbackSubmissionSchema } from "../../_lib/schema";
import { sanitizeFeedback } from "../../_lib/sanitize";
import { setCors } from "../../_lib/cors";

// ─── In-memory rate limiting + nonce tracking ──────────────────────────────
// Note: In serverless, these reset per cold start. For production scale,
// move to Redis or Upstash. Acceptable for current traffic levels.

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(agentId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimits.get(agentId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(agentId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

const usedNonces = new Set<string>();

function recomputeTrustScore(reviews: any[]) {
  const count = reviews.length;
  if (count === 0) return { trustScore: 0, successRate: 0, avgWorks: 0, avgRel: 0, avgDoc: 0, avgSafe: 0, secFlags: 0 };

  const successRate = reviews.filter(r => r.succeeded).length / count;
  const avgWorks = reviews.reduce((s: number, r: any) => s + r.ratingWorksAsDescribed, 0) / count;
  const avgRel = reviews.reduce((s: number, r: any) => s + r.ratingReliability, 0) / count;
  const avgDoc = reviews.reduce((s: number, r: any) => s + r.ratingDocumentation, 0) / count;
  const avgSafe = reviews.reduce((s: number, r: any) => s + r.ratingSafety, 0) / count;
  const secFlags = reviews.filter((r: any) => r.securityConcerns && r.securityConcerns.length > 0).length;

  let trustScore =
    (successRate * 100) * 0.30 +
    ((avgWorks / 5) * 100) * 0.25 +
    ((avgRel / 5) * 100) * 0.20 +
    ((avgDoc / 5) * 100) * 0.10 +
    ((avgSafe / 5) * 100) * 0.15;

  if (secFlags >= 3) trustScore = Math.max(0, trustScore - 20);
  else if (secFlags >= 1) trustScore = Math.max(0, trustScore - 5 * secFlags);
  trustScore = Math.round(trustScore * 10) / 10;

  return {
    trustScore, successRate,
    avgWorks: Math.round(avgWorks * 10) / 10,
    avgRel: Math.round(avgRel * 10) / 10,
    avgDoc: Math.round(avgDoc * 10) / 10,
    avgSafe: Math.round(avgSafe * 10) / 10,
    secFlags,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // 1. Validate schema
    const parsed = feedbackSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "invalid_request",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const db = getDb();

    // 2. Verify agent exists
    const [agent] = await db.select().from(agents).where(eq(agents.agentId, data.agent_id));
    if (!agent) {
      return res.status(401).json({
        error: "agent_not_found",
        message: "Register at POST /api/v1/agents/register first.",
      });
    }

    // 3. Rate limit
    const rateCheck = checkRateLimit(data.agent_id);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", String(rateCheck.retryAfter));
      return res.status(429).json({
        error: "rate_limit_exceeded",
        retry_after_seconds: rateCheck.retryAfter,
      });
    }

    // 4. Check nonce (replay prevention)
    if (usedNonces.has(data.nonce)) {
      return res.status(409).json({
        error: "nonce_already_used",
        message: "This feedback has already been submitted. Generate a new nonce.",
      });
    }

    // 5. Verify timestamp within 5 minutes
    const submittedAt = new Date(data.timestamp).getTime();
    if (Math.abs(Date.now() - submittedAt) > 5 * 60 * 1000) {
      return res.status(400).json({
        error: "timestamp_expired",
        message: "Timestamp must be within 5 minutes of server time.",
      });
    }

    // 6. Sanitize text fields
    const sanitized = sanitizeFeedback({
      error_details: data.error_details,
      error_type: data.error_type,
      suggested_improvements: data.suggested_improvements,
      security_concerns: data.security_concerns,
      task_category: data.task_category,
    });

    if (sanitized.rejected) {
      return res.status(422).json({
        error: "content_rejected",
        message: sanitized.reason,
      });
    }

    // 7. Store feedback (upsert: delete existing, then insert)
    usedNonces.add(data.nonce);

    await db.delete(feedback).where(
      and(eq(feedback.agentId, data.agent_id), eq(feedback.skillName, data.skill_name))
    );

    const [fb] = await db.insert(feedback).values({
      agentId: data.agent_id,
      skillName: data.skill_name,
      skillVersion: data.skill_version,
      proofOfUse: data.proof_of_use,
      taskCategory: sanitized.sanitized.task_category,
      taskComplexity: data.task_complexity,
      succeeded: data.succeeded,
      errorType: sanitized.sanitized.error_type ?? null,
      errorDetails: sanitized.sanitized.error_details ?? null,
      ratingWorksAsDescribed: data.ratings.works_as_described,
      ratingReliability: data.ratings.reliability,
      ratingDocumentation: data.ratings.documentation_quality,
      ratingSafety: data.ratings.safety,
      suggestedImprovements: sanitized.sanitized.suggested_improvements ?? null,
      securityConcerns: sanitized.sanitized.security_concerns ?? null,
      signature: data.signature,
      nonce: data.nonce,
    }).returning();

    // 8. Increment agent feedback count
    await db.update(agents)
      .set({ feedbackCount: sql`${agents.feedbackCount} + 1` })
      .where(eq(agents.agentId, data.agent_id));

    // 9. Recompute aggregates
    const reviews = await db.select().from(feedback).where(eq(feedback.skillName, data.skill_name));
    const scores = recomputeTrustScore(reviews);

    await db.insert(feedbackAggregates)
      .values({
        skillName: data.skill_name,
        reviewCount: reviews.length,
        successRate: scores.successRate,
        avgWorksAsDescribed: scores.avgWorks,
        avgReliability: scores.avgRel,
        avgDocumentation: scores.avgDoc,
        avgSafety: scores.avgSafe,
        trustScore: scores.trustScore,
        securityFlagCount: scores.secFlags,
      })
      .onConflictDoUpdate({
        target: feedbackAggregates.skillName,
        set: {
          reviewCount: reviews.length,
          successRate: scores.successRate,
          avgWorksAsDescribed: scores.avgWorks,
          avgReliability: scores.avgRel,
          avgDocumentation: scores.avgDoc,
          avgSafety: scores.avgSafe,
          trustScore: scores.trustScore,
          securityFlagCount: scores.secFlags,
          lastUpdated: new Date(),
        },
      });

    res.status(201).json({
      success: true,
      feedback_id: fb.id,
      skill_trust_score: scores.trustScore,
      review_count: reviews.length,
      message: "Feedback recorded. Thank you for improving HermesHub.",
    });
  } catch (e: any) {
    console.error("Feedback submission error:", e);
    res.status(500).json({ error: "internal_error", message: "Failed to submit feedback." });
  }
}
