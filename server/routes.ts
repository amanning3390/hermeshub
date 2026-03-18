import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { getFeedbackStore } from "./feedback-store";
import { sanitizeFeedback } from "./sanitize";
import {
  feedbackSubmissionSchema,
  agentRegistrationSchema,
  type FeedbackSubmission,
} from "@shared/schema";

// ─── Rate Limiting (in-memory, per-process) ─────────────────────────────────

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30;           // 30 requests per minute per agent

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

// ─── Nonce tracking (prevents replay attacks) ───────────────────────────────

const usedNonces = new Set<string>();
const NONCE_TTL = 60 * 60 * 1000; // 1 hour

// Clean old nonces every 10 minutes
setInterval(() => {
  usedNonces.clear();
}, 10 * 60 * 1000);

export async function registerRoutes(server: Server, app: Express) {
  // ═══════════════════════════════════════════════════════════════════════
  // EXISTING SKILL ROUTES
  // ═══════════════════════════════════════════════════════════════════════

  app.get("/api/skills", async (_req, res) => {
    const skills = await storage.getSkills();
    res.json(skills);
  });

  app.get("/api/skills/featured", async (_req, res) => {
    const skills = await storage.getFeaturedSkills();
    res.json(skills);
  });

  app.get("/api/skills/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    const skills = await storage.searchSkills(query);
    res.json(skills);
  });

  app.get("/api/skills/category/:category", async (req, res) => {
    const skills = await storage.getSkillsByCategory(req.params.category);
    res.json(skills);
  });

  app.get("/api/skills/:name", async (req, res) => {
    const skill = await storage.getSkillByName(req.params.name);
    if (!skill) return res.status(404).json({ message: "Skill not found" });
    res.json(skill);
  });

  app.get("/api/categories", async (_req, res) => {
    const skills = await storage.getSkills();
    const categories: Record<string, number> = {};
    for (const skill of skills) {
      categories[skill.category] = (categories[skill.category] || 0) + 1;
    }
    res.json(categories);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AGENT IDENTITY API — /api/v1/agents
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/agents/register
   * Register a new agent identity with an Ed25519 public key.
   */
  app.post("/api/v1/agents/register", async (req: Request, res: Response) => {
    try {
      const parsed = agentRegistrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_request",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const store = await getFeedbackStore();
      const { name, model, owner_hash, public_key } = parsed.data;

      // Check for duplicate public key
      const existing = await store.getAgentByPublicKey(public_key);
      if (existing) {
        return res.status(409).json({
          error: "agent_already_registered",
          agent_id: existing.agentId,
          message: "An agent with this public key is already registered.",
        });
      }

      const agentId = randomUUID();
      const agent = await store.createAgent({
        agentId,
        name,
        model: model ?? null,
        ownerHash: owner_hash ?? null,
        ownerGithub: null,
        publicKey: public_key,
      });

      res.status(201).json({
        success: true,
        agent_id: agent.agentId,
        name: agent.name,
        verified: agent.verified,
        message: "Agent registered. Verify ownership by linking your GitHub account.",
      });
    } catch (e: any) {
      console.error("Agent registration error:", e);
      res.status(500).json({ error: "internal_error", message: "Registration failed." });
    }
  });

  /**
   * GET /api/v1/agents/:agentId
   * Get agent public profile.
   */
  app.get("/api/v1/agents/:agentId", async (req: Request, res: Response) => {
    try {
      const store = await getFeedbackStore();
      const agent = await store.getAgentById(req.params.agentId);
      if (!agent) {
        return res.status(404).json({ error: "agent_not_found" });
      }

      // Return public fields only (never expose publicKey or ownerHash)
      res.json({
        agent_id: agent.agentId,
        name: agent.name,
        model: agent.model,
        verified: agent.verified,
        trust_score: agent.trustScore,
        feedback_count: agent.feedbackCount,
        created_at: agent.createdAt,
      });
    } catch (e) {
      res.status(500).json({ error: "internal_error" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FEEDBACK API — /api/v1/feedback
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/feedback
   * Submit structured feedback for a skill. Requires agent registration.
   */
  app.post("/api/v1/feedback", async (req: Request, res: Response) => {
    try {
      // 1. Validate schema
      const parsed = feedbackSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_request",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const data: FeedbackSubmission = parsed.data;
      const store = await getFeedbackStore();

      // 2. Verify agent exists
      const agent = await store.getAgentById(data.agent_id);
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
          message: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
        });
      }

      // 4. Check nonce (replay prevention)
      if (usedNonces.has(data.nonce)) {
        return res.status(409).json({
          error: "nonce_already_used",
          message: "This feedback has already been submitted. Generate a new nonce.",
        });
      }

      // 5. Verify timestamp is within 5 minutes
      const submittedAt = new Date(data.timestamp).getTime();
      const now = Date.now();
      if (Math.abs(now - submittedAt) > 5 * 60 * 1000) {
        return res.status(400).json({
          error: "timestamp_expired",
          message: "Timestamp must be within 5 minutes of server time.",
        });
      }

      // 6. Verify skill exists
      const skill = await storage.getSkillByName(data.skill_name);
      if (!skill) {
        return res.status(404).json({
          error: "skill_not_found",
          message: `Skill '${data.skill_name}' not found on HermesHub.`,
        });
      }

      // 7. Sanitize text fields
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

      // 8. Store feedback
      usedNonces.add(data.nonce);

      const fb = await store.createFeedback({
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
      });

      // 9. Recompute aggregates
      await store.incrementAgentFeedbackCount(data.agent_id);
      const aggregate = await store.recomputeAggregate(data.skill_name);

      res.status(201).json({
        success: true,
        feedback_id: fb.id,
        skill_trust_score: aggregate.trustScore,
        review_count: aggregate.reviewCount,
        message: "Feedback recorded. Thank you for improving HermesHub.",
      });
    } catch (e: any) {
      console.error("Feedback submission error:", e);
      res.status(500).json({ error: "internal_error", message: "Failed to submit feedback." });
    }
  });

  /**
   * GET /api/v1/feedback/:skill
   * Get all feedback for a skill, paginated.
   */
  app.get("/api/v1/feedback/:skill", async (req: Request, res: Response) => {
    try {
      const store = await getFeedbackStore();
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const reviews = await store.getFeedbackForSkill(req.params.skill, limit, offset);
      const total = await store.getFeedbackCount(req.params.skill);
      const aggregate = await store.getAggregate(req.params.skill);

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
        // Wrap text in untrusted_content marker
        error_details: r.errorDetails ? { untrusted_content: true, data: r.errorDetails } : null,
        suggested_improvements: r.suggestedImprovements?.map(s => ({ untrusted_content: true, data: s })) ?? [],
        security_concerns: r.securityConcerns?.map(s => ({ untrusted_content: true, data: s })) ?? [],
        created_at: r.createdAt,
      }));

      res.json({
        skill: req.params.skill,
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
      res.status(500).json({ error: "internal_error" });
    }
  });

  /**
   * GET /api/v1/feedback/score/:skill
   * Get just the aggregate trust score for a skill.
   */
  app.get("/api/v1/feedback/score/:skill", async (req: Request, res: Response) => {
    try {
      const store = await getFeedbackStore();
      const aggregate = await store.getAggregate(req.params.skill);

      if (!aggregate || aggregate.reviewCount === 0) {
        return res.json({
          skill: req.params.skill,
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

      res.json({
        skill: req.params.skill,
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
      res.status(500).json({ error: "internal_error" });
    }
  });

  /**
   * GET /api/v1/feedback/stats
   * Global feedback stats.
   */
  app.get("/api/v1/feedback/stats", async (_req: Request, res: Response) => {
    try {
      const store = await getFeedbackStore();
      const aggregates = await store.getAllAggregates();
      const totalReviews = aggregates.reduce((s, a) => s + a.reviewCount, 0);
      const skillsReviewed = aggregates.filter(a => a.reviewCount > 0).length;
      const avgTrustScore = skillsReviewed > 0
        ? aggregates.filter(a => a.reviewCount > 0).reduce((s, a) => s + a.trustScore, 0) / skillsReviewed
        : 0;

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
      res.status(500).json({ error: "internal_error" });
    }
  });
}
