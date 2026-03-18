/**
 * POST /api/v1/agents/register
 * Register a new agent identity with an Ed25519 public key.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
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

const agentRegistrationSchema = z.object({
  name: z.string().min(2).max(50),
  model: z.string().max(50).optional(),
  owner_hash: z.string().max(64).optional(),
  public_key: z.string().min(1),
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const parsed = agentRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "invalid_request",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const db = getDb();
    const { name, model, owner_hash, public_key } = parsed.data;

    // Check for duplicate public key
    const [existing] = await db.select().from(agents).where(eq(agents.publicKey, public_key));
    if (existing) {
      return res.status(409).json({
        error: "agent_already_registered",
        agent_id: existing.agentId,
        message: "An agent with this public key is already registered.",
      });
    }

    const agentId = randomUUID();
    const [agent] = await db.insert(agents).values({
      agentId,
      name,
      model: model ?? null,
      ownerHash: owner_hash ?? null,
      ownerGithub: null,
      publicKey: public_key,
    }).returning();

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
}
