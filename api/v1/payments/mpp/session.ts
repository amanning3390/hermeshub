import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, uuid, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import crypto from "crypto";

// ── DB connection ──────────────────────────────────────────────────────────────
let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  _db = drizzle(neon(url));
  return _db;
}

// ── Inline schema ──────────────────────────────────────────────────────────────
const mppSessions = pgTable("mpp_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerEmail: varchar("buyer_email", { length: 255 }).notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).unique(),
  spendingLimit: decimal("spending_limit", { precision: 10, scale: 2 }).notNull(),
  amountSpent: decimal("amount_spent", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Input validation ───────────────────────────────────────────────────────────
const CreateSessionSchema = z.object({
  buyer_email: z.string().email("Invalid email address"),
  spending_limit: z
    .number()
    .min(1.0, "spending_limit must be at least 1.00")
    .max(1000.0, "spending_limit cannot exceed 1000.00"),
});

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const parseResult = CreateSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { buyer_email, spending_limit } = parseResult.data;

    const db = getDb();

    // Phase 1: generate a mock stripe session ID (no real Stripe integration yet)
    const mockStripeSessionId = `mock_sess_${crypto.randomBytes(16).toString("hex")}`;

    // expires_at = now + 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const inserted = await db
      .insert(mppSessions)
      .values({
        buyerEmail: buyer_email,
        stripeSessionId: mockStripeSessionId,
        spendingLimit: spending_limit.toFixed(2),
        amountSpent: "0",
        status: "active",
        expiresAt,
      })
      .returning({
        id: mppSessions.id,
        buyerEmail: mppSessions.buyerEmail,
        spendingLimit: mppSessions.spendingLimit,
        amountSpent: mppSessions.amountSpent,
        status: mppSessions.status,
        expiresAt: mppSessions.expiresAt,
        createdAt: mppSessions.createdAt,
      });

    const session = inserted[0];

    return res.status(201).json({
      session_id: session.id,
      buyer_email: session.buyerEmail,
      spending_limit: session.spendingLimit,
      amount_spent: session.amountSpent,
      status: session.status,
      expires_at: session.expiresAt,
      created_at: session.createdAt,
    });
  } catch (err: unknown) {
    console.error("mpp session error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
