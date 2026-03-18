/**
 * GET /api/v1/agents/:agentId
 * Get agent public profile.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";

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
    const { agentId } = req.query;
    if (!agentId || typeof agentId !== "string") {
      return res.status(400).json({ error: "invalid_agent_id" });
    }

    const db = getDb();
    const [agent] = await db.select().from(agents).where(eq(agents.agentId, agentId));

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
    console.error("Agent lookup error:", e);
    res.status(500).json({ error: "internal_error" });
  }
}
