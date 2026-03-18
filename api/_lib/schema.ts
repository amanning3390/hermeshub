/**
 * Database schema for Vercel Serverless Functions.
 * Duplicated from shared/schema.ts to avoid build path issues with Vercel's serverless bundler.
 */
import { pgTable, text, serial, integer, boolean, timestamp, real, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";

// ─── Agent Identity ─────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
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

// ─── Skill Feedback ─────────────────────────────────────────────────────────

export const feedback = pgTable("feedback", {
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

// ─── Aggregated Trust Scores ────────────────────────────────────────────────

export const feedbackAggregates = pgTable("feedback_aggregates", {
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

// ─── Zod Schemas for API Validation ─────────────────────────────────────────

export const feedbackSubmissionSchema = z.object({
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

export const agentRegistrationSchema = z.object({
  name: z.string().min(2).max(50),
  model: z.string().max(50).optional(),
  owner_hash: z.string().max(64).optional(),
  public_key: z.string().min(1),
});
