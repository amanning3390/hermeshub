/**
 * Feedback Storage Layer
 *
 * Uses Neon serverless Postgres via Drizzle ORM for agent identity
 * and skill feedback. Falls back to in-memory storage when no
 * DATABASE_URL is configured (local dev / static builds).
 */

import {
  type Agent, type InsertAgent,
  type Feedback, type InsertFeedback,
  type FeedbackAggregate,
  agents, feedback, feedbackAggregates,
} from "@shared/schema";

export interface IFeedbackStore {
  // Agents
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgentById(agentId: string): Promise<Agent | undefined>;
  getAgentByPublicKey(publicKey: string): Promise<Agent | undefined>;
  updateAgentVerification(agentId: string, ownerGithub: string): Promise<void>;
  incrementAgentFeedbackCount(agentId: string): Promise<void>;

  // Feedback
  createFeedback(fb: InsertFeedback): Promise<Feedback>;
  getFeedbackForSkill(skillName: string, limit?: number, offset?: number): Promise<Feedback[]>;
  getFeedbackByAgent(agentId: string, skillName: string): Promise<Feedback | undefined>;
  getFeedbackCount(skillName: string): Promise<number>;

  // Aggregates
  getAggregate(skillName: string): Promise<FeedbackAggregate | undefined>;
  recomputeAggregate(skillName: string): Promise<FeedbackAggregate>;
  getAllAggregates(): Promise<FeedbackAggregate[]>;
}

// ─── In-Memory Implementation (dev/static fallback) ─────────────────────────

export class MemFeedbackStore implements IFeedbackStore {
  private agentMap = new Map<string, Agent>();
  private feedbackList: Feedback[] = [];
  private aggregateMap = new Map<string, FeedbackAggregate>();
  private nextAgentId = 1;
  private nextFeedbackId = 1;

  async createAgent(data: InsertAgent): Promise<Agent> {
    const agent: Agent = {
      id: this.nextAgentId++,
      agentId: data.agentId,
      name: data.name,
      model: data.model ?? null,
      ownerHash: data.ownerHash ?? null,
      ownerGithub: data.ownerGithub ?? null,
      publicKey: data.publicKey,
      verified: false,
      trustScore: 50,
      feedbackCount: 0,
      createdAt: new Date(),
    };
    this.agentMap.set(data.agentId, agent);
    return agent;
  }

  async getAgentById(agentId: string): Promise<Agent | undefined> {
    return this.agentMap.get(agentId);
  }

  async getAgentByPublicKey(publicKey: string): Promise<Agent | undefined> {
    return Array.from(this.agentMap.values()).find(a => a.publicKey === publicKey);
  }

  async updateAgentVerification(agentId: string, ownerGithub: string): Promise<void> {
    const agent = this.agentMap.get(agentId);
    if (agent) {
      agent.verified = true;
      agent.ownerGithub = ownerGithub;
    }
  }

  async incrementAgentFeedbackCount(agentId: string): Promise<void> {
    const agent = this.agentMap.get(agentId);
    if (agent) agent.feedbackCount++;
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    // Remove existing feedback from this agent for this skill (upsert)
    this.feedbackList = this.feedbackList.filter(
      f => !(f.agentId === data.agentId && f.skillName === data.skillName)
    );

    const fb: Feedback = {
      id: this.nextFeedbackId++,
      agentId: data.agentId,
      skillName: data.skillName,
      skillVersion: data.skillVersion,
      proofOfUse: data.proofOfUse,
      taskCategory: data.taskCategory,
      taskComplexity: data.taskComplexity,
      succeeded: data.succeeded,
      errorType: data.errorType ?? null,
      errorDetails: data.errorDetails ?? null,
      ratingWorksAsDescribed: data.ratingWorksAsDescribed,
      ratingReliability: data.ratingReliability,
      ratingDocumentation: data.ratingDocumentation,
      ratingSafety: data.ratingSafety,
      suggestedImprovements: data.suggestedImprovements ?? null,
      securityConcerns: data.securityConcerns ?? null,
      signature: data.signature,
      nonce: data.nonce,
      createdAt: new Date(),
    };
    this.feedbackList.push(fb);
    return fb;
  }

  async getFeedbackForSkill(skillName: string, limit = 50, offset = 0): Promise<Feedback[]> {
    return this.feedbackList
      .filter(f => f.skillName === skillName)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async getFeedbackByAgent(agentId: string, skillName: string): Promise<Feedback | undefined> {
    return this.feedbackList.find(f => f.agentId === agentId && f.skillName === skillName);
  }

  async getFeedbackCount(skillName: string): Promise<number> {
    return this.feedbackList.filter(f => f.skillName === skillName).length;
  }

  async getAggregate(skillName: string): Promise<FeedbackAggregate | undefined> {
    return this.aggregateMap.get(skillName);
  }

  async recomputeAggregate(skillName: string): Promise<FeedbackAggregate> {
    const reviews = this.feedbackList.filter(f => f.skillName === skillName);
    const count = reviews.length;

    if (count === 0) {
      const agg: FeedbackAggregate = {
        id: 0, skillName, reviewCount: 0, successRate: 0,
        avgWorksAsDescribed: 0, avgReliability: 0,
        avgDocumentation: 0, avgSafety: 0,
        trustScore: 0, securityFlagCount: 0,
        lastUpdated: new Date(),
      };
      this.aggregateMap.set(skillName, agg);
      return agg;
    }

    const successRate = reviews.filter(r => r.succeeded).length / count;
    const avgWorks = reviews.reduce((s, r) => s + r.ratingWorksAsDescribed, 0) / count;
    const avgRel = reviews.reduce((s, r) => s + r.ratingReliability, 0) / count;
    const avgDoc = reviews.reduce((s, r) => s + r.ratingDocumentation, 0) / count;
    const avgSafe = reviews.reduce((s, r) => s + r.ratingSafety, 0) / count;
    const secFlags = reviews.filter(r => r.securityConcerns && r.securityConcerns.length > 0).length;

    // Trust Score = weighted average (0-100)
    const worksNorm = (avgWorks / 5) * 100;
    const relNorm = (avgRel / 5) * 100;
    const docNorm = (avgDoc / 5) * 100;
    const safeNorm = (avgSafe / 5) * 100;
    const successNorm = successRate * 100;

    let trustScore =
      successNorm * 0.30 +
      worksNorm * 0.25 +
      relNorm * 0.20 +
      docNorm * 0.10 +
      safeNorm * 0.15;

    // Security penalty
    if (secFlags >= 3) trustScore = Math.max(0, trustScore - 20);
    else if (secFlags >= 1) trustScore = Math.max(0, trustScore - 5 * secFlags);

    trustScore = Math.round(trustScore * 10) / 10;

    const agg: FeedbackAggregate = {
      id: 0, skillName, reviewCount: count, successRate,
      avgWorksAsDescribed: Math.round(avgWorks * 10) / 10,
      avgReliability: Math.round(avgRel * 10) / 10,
      avgDocumentation: Math.round(avgDoc * 10) / 10,
      avgSafety: Math.round(avgSafe * 10) / 10,
      trustScore,
      securityFlagCount: secFlags,
      lastUpdated: new Date(),
    };
    this.aggregateMap.set(skillName, agg);
    return agg;
  }

  async getAllAggregates(): Promise<FeedbackAggregate[]> {
    return Array.from(this.aggregateMap.values());
  }
}

// ─── Database Implementation (Neon Postgres) ────────────────────────────────

export class DbFeedbackStore implements IFeedbackStore {
  private db: any; // drizzle instance

  constructor(db: any) {
    this.db = db;
  }

  async createAgent(data: InsertAgent): Promise<Agent> {
    const { eq } = await import("drizzle-orm");
    const [agent] = await this.db.insert(agents).values({
      agentId: data.agentId,
      name: data.name,
      model: data.model,
      ownerHash: data.ownerHash,
      ownerGithub: data.ownerGithub,
      publicKey: data.publicKey,
    }).returning();
    return agent;
  }

  async getAgentById(agentId: string): Promise<Agent | undefined> {
    const { eq } = await import("drizzle-orm");
    const [agent] = await this.db.select().from(agents).where(eq(agents.agentId, agentId));
    return agent;
  }

  async getAgentByPublicKey(publicKey: string): Promise<Agent | undefined> {
    const { eq } = await import("drizzle-orm");
    const [agent] = await this.db.select().from(agents).where(eq(agents.publicKey, publicKey));
    return agent;
  }

  async updateAgentVerification(agentId: string, ownerGithub: string): Promise<void> {
    const { eq } = await import("drizzle-orm");
    await this.db.update(agents)
      .set({ verified: true, ownerGithub })
      .where(eq(agents.agentId, agentId));
  }

  async incrementAgentFeedbackCount(agentId: string): Promise<void> {
    const { eq, sql } = await import("drizzle-orm");
    await this.db.update(agents)
      .set({ feedbackCount: sql`${agents.feedbackCount} + 1` })
      .where(eq(agents.agentId, agentId));
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const { eq, and } = await import("drizzle-orm");
    // Upsert: delete existing then insert
    await this.db.delete(feedback).where(
      and(eq(feedback.agentId, data.agentId), eq(feedback.skillName, data.skillName))
    );
    const [fb] = await this.db.insert(feedback).values(data).returning();
    return fb;
  }

  async getFeedbackForSkill(skillName: string, limit = 50, offset = 0): Promise<Feedback[]> {
    const { eq, desc } = await import("drizzle-orm");
    return this.db.select().from(feedback)
      .where(eq(feedback.skillName, skillName))
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getFeedbackByAgent(agentId: string, skillName: string): Promise<Feedback | undefined> {
    const { eq, and } = await import("drizzle-orm");
    const [fb] = await this.db.select().from(feedback)
      .where(and(eq(feedback.agentId, agentId), eq(feedback.skillName, skillName)));
    return fb;
  }

  async getFeedbackCount(skillName: string): Promise<number> {
    const { eq, count } = await import("drizzle-orm");
    const [result] = await this.db.select({ count: count() }).from(feedback)
      .where(eq(feedback.skillName, skillName));
    return result?.count ?? 0;
  }

  async getAggregate(skillName: string): Promise<FeedbackAggregate | undefined> {
    const { eq } = await import("drizzle-orm");
    const [agg] = await this.db.select().from(feedbackAggregates)
      .where(eq(feedbackAggregates.skillName, skillName));
    return agg;
  }

  async recomputeAggregate(skillName: string): Promise<FeedbackAggregate> {
    const { eq, avg, count, sql } = await import("drizzle-orm");

    const reviews = await this.db.select().from(feedback)
      .where(eq(feedback.skillName, skillName));

    const reviewCount = reviews.length;

    if (reviewCount === 0) {
      // Upsert empty
      await this.db.insert(feedbackAggregates)
        .values({ skillName, reviewCount: 0, successRate: 0, avgWorksAsDescribed: 0, avgReliability: 0, avgDocumentation: 0, avgSafety: 0, trustScore: 0, securityFlagCount: 0 })
        .onConflictDoUpdate({
          target: feedbackAggregates.skillName,
          set: { reviewCount: 0, trustScore: 0, lastUpdated: new Date() },
        });
      return (await this.getAggregate(skillName))!;
    }

    const successRate = reviews.filter((r: Feedback) => r.succeeded).length / reviewCount;
    const avgWorks = reviews.reduce((s: number, r: Feedback) => s + r.ratingWorksAsDescribed, 0) / reviewCount;
    const avgRel = reviews.reduce((s: number, r: Feedback) => s + r.ratingReliability, 0) / reviewCount;
    const avgDoc = reviews.reduce((s: number, r: Feedback) => s + r.ratingDocumentation, 0) / reviewCount;
    const avgSafe = reviews.reduce((s: number, r: Feedback) => s + r.ratingSafety, 0) / reviewCount;
    const secFlags = reviews.filter((r: Feedback) => r.securityConcerns && r.securityConcerns.length > 0).length;

    const worksNorm = (avgWorks / 5) * 100;
    const relNorm = (avgRel / 5) * 100;
    const docNorm = (avgDoc / 5) * 100;
    const safeNorm = (avgSafe / 5) * 100;
    const successNorm = successRate * 100;

    let trustScore =
      successNorm * 0.30 +
      worksNorm * 0.25 +
      relNorm * 0.20 +
      docNorm * 0.10 +
      safeNorm * 0.15;

    if (secFlags >= 3) trustScore = Math.max(0, trustScore - 20);
    else if (secFlags >= 1) trustScore = Math.max(0, trustScore - 5 * secFlags);
    trustScore = Math.round(trustScore * 10) / 10;

    await this.db.insert(feedbackAggregates)
      .values({
        skillName, reviewCount, successRate,
        avgWorksAsDescribed: Math.round(avgWorks * 10) / 10,
        avgReliability: Math.round(avgRel * 10) / 10,
        avgDocumentation: Math.round(avgDoc * 10) / 10,
        avgSafety: Math.round(avgSafe * 10) / 10,
        trustScore, securityFlagCount: secFlags,
      })
      .onConflictDoUpdate({
        target: feedbackAggregates.skillName,
        set: {
          reviewCount, successRate,
          avgWorksAsDescribed: Math.round(avgWorks * 10) / 10,
          avgReliability: Math.round(avgRel * 10) / 10,
          avgDocumentation: Math.round(avgDoc * 10) / 10,
          avgSafety: Math.round(avgSafe * 10) / 10,
          trustScore, securityFlagCount: secFlags,
          lastUpdated: new Date(),
        },
      });

    return (await this.getAggregate(skillName))!;
  }

  async getAllAggregates(): Promise<FeedbackAggregate[]> {
    return this.db.select().from(feedbackAggregates);
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let feedbackStore: IFeedbackStore | null = null;

export async function getFeedbackStore(): Promise<IFeedbackStore> {
  if (feedbackStore) return feedbackStore;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const { drizzle } = await import("drizzle-orm/neon-http");
      const sql = neon(dbUrl);
      const db = drizzle(sql);
      feedbackStore = new DbFeedbackStore(db);
      console.log("✅ Feedback store: Neon Postgres connected");
    } catch (e) {
      console.warn("⚠️ Database connection failed, falling back to in-memory:", e);
      feedbackStore = new MemFeedbackStore();
    }
  } else {
    console.log("ℹ️ No DATABASE_URL, using in-memory feedback store");
    feedbackStore = new MemFeedbackStore();
  }

  return feedbackStore;
}
