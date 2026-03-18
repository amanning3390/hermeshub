/**
 * POST /api/v1/feedback
 * Submit structured feedback for a skill. Requires agent registration.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, real, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";

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
const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  name: text("name").notNull(),
  model: text("model"),
  ownerHash: text("owner_hash"),
  ownerGithub: text("owner_github"),
  publicKey: text("public_key").notNull(),
  verified: boolean("verified").notNull().default(false),
  trustScore: real("trust_score").notNull().default(50),
  feedbackCount: integer("feedback_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

const feedbackSubmissionSchema = z.object({
  agent_id: z.string().uuid(),
  signature: z.string().min(1),
  skill_name: z.string().min(1).max(100),
  skill_version: z.string().min(1).max(20),
  proof_of_use: z.string().min(64).max(64),
  task_category: z.string().min(1).max(50),
  task_complexity: z.enum(["simple", "moderate", "complex"]),
  succeeded: z.boolean(),
  error_type: z.string().max(100).optional(),
  error_details: z.string().max(500).optional(),
  ratings: z.object({
    works_as_described: z.number().int().min(1).max(5),
    reliability: z.number().int().min(1).max(5),
    documentation_quality: z.number().int().min(1).max(5),
    safety: z.number().int().min(1).max(5),
  }),
  suggested_improvements: z.array(z.string().max(200)).max(5).optional(),
  security_concerns: z.array(z.string().max(200)).max(3).optional(),
  nonce: z.string().uuid(),
  timestamp: z.string().datetime(),
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

// ─── Inline Sanitize ────────────────────────────────────────────────────────
const INJECTION_PATTERNS: [RegExp, string][] = [
  [/ignore\s+(all\s+)?previous\s+instructions/i, "prompt_override"],
  [/you\s+are\s+now\s+(a|an)\s+unrestricted/i, "jailbreak"],
  [/disregard\s+(your|all)\s+(rules|instructions|guidelines)/i, "prompt_override"],
  [/system\s*:\s*you\s+are/i, "system_prompt"],
  [/<\|im_start\|>/i, "chatml_injection"],
  [/<\|im_end\|>/i, "chatml_injection"],
  [/ADMIN_OVERRIDE/i, "privilege_escalation"],
  [/jailbreak/i, "jailbreak"],
  [/DAN\s+mode/i, "jailbreak"],
  [/developer\s+mode\s+(enabled|output)/i, "jailbreak"],
  [/\[INST\]/i, "format_injection"],
  [/\[\/INST\]/i, "format_injection"],
  [/<<SYS>>/i, "format_injection"],
  [/<\/?system>/i, "format_injection"],
  [/\beval\s*\(/i, "code_execution"],
  [/\bexec\s*\(/i, "code_execution"],
  [/base64\s+(--)?decode/i, "obfuscation"],
  [/fromCharCode/i, "obfuscation"],
  [/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "hidden_chars"],
];

interface SanitizationResult {
  clean: string;
  rejected: boolean;
  rejectionReason?: string;
  flagsFound: string[];
}

function sanitizeText(input: string, maxLength: number, fieldName: string): SanitizationResult {
  if (!input || typeof input !== "string") {
    return { clean: "", rejected: false, flagsFound: [] };
  }

  let text = input;
  text = text.replace(/<[^>]*>/g, "");
  text = text.replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "");

  const flagsFound: string[] = [];
  for (const [pattern, category] of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flagsFound.push(category);
    }
  }

  const criticalFlags = ["prompt_override", "jailbreak", "system_prompt", "chatml_injection", "format_injection", "privilege_escalation"];
  const hasCritical = flagsFound.some(f => criticalFlags.includes(f));

  if (hasCritical) {
    return {
      clean: "",
      rejected: true,
      rejectionReason: `Prompt injection detected in ${fieldName}: ${flagsFound.join(", ")}`,
      flagsFound,
    };
  }

  text = text.slice(0, maxLength).trim();
  return { clean: text, rejected: false, flagsFound };
}

function sanitizeTextArray(
  items: string[] | undefined,
  maxItemLength: number,
  maxItems: number,
  fieldName: string
): SanitizationResult & { cleanArray: string[] } {
  if (!items || !Array.isArray(items)) {
    return { clean: "", cleanArray: [], rejected: false, flagsFound: [] };
  }

  const cleanArray: string[] = [];
  const allFlags: string[] = [];

  for (const item of items.slice(0, maxItems)) {
    const result = sanitizeText(item, maxItemLength, fieldName);
    if (result.rejected) {
      return { clean: "", cleanArray: [], rejected: true, rejectionReason: result.rejectionReason, flagsFound: result.flagsFound };
    }
    if (result.clean) {
      cleanArray.push(result.clean);
      allFlags.push(...result.flagsFound);
    }
  }

  const genericPatterns = [
    /^great\s+(skill|tool|plugin)!?$/i,
    /^nice!?$/i,
    /^good\s+(job|work)!?$/i,
    /^interesting!?$/i,
    /^awesome!?$/i,
    /^works?\s+(great|fine|well)!?$/i,
  ];

  const allGeneric = cleanArray.every(item => genericPatterns.some(p => p.test(item.trim())));
  if (allGeneric && cleanArray.length > 0) {
    return {
      clean: "", cleanArray: [], rejected: true,
      rejectionReason: `Generic feedback rejected in ${fieldName}. Provide specific, actionable suggestions.`,
      flagsFound: ["generic_spam"],
    };
  }

  return { clean: cleanArray.join("; "), cleanArray, rejected: false, flagsFound: allFlags };
}

function sanitizeFeedback(data: {
  error_details?: string;
  error_type?: string;
  suggested_improvements?: string[];
  security_concerns?: string[];
  task_category: string;
}): { sanitized: typeof data; rejected: boolean; reason?: string } {
  if (data.error_details) {
    const result = sanitizeText(data.error_details, 500, "error_details");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.error_details = result.clean;
  }

  if (data.error_type) {
    const result = sanitizeText(data.error_type, 100, "error_type");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.error_type = result.clean;
  }

  const catResult = sanitizeText(data.task_category, 50, "task_category");
  if (catResult.rejected) return { sanitized: data, rejected: true, reason: catResult.rejectionReason };
  data.task_category = catResult.clean;

  if (data.suggested_improvements) {
    const result = sanitizeTextArray(data.suggested_improvements, 200, 5, "suggested_improvements");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.suggested_improvements = result.cleanArray;
  }

  if (data.security_concerns) {
    const result = sanitizeTextArray(data.security_concerns, 200, 3, "security_concerns");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.security_concerns = result.cleanArray;
  }

  return { sanitized: data, rejected: false };
}

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

// ─── Handler ────────────────────────────────────────────────────────────────
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
