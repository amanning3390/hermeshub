import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
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

// ── Inline schemas ─────────────────────────────────────────────────────────────
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

const privateSkills = pgTable("private_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  version: varchar("version", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  acceptedProtocols: text("accepted_protocols").array(),
  acceptedChains: text("accepted_chains").array(),
  archiveUrl: varchar("archive_url", { length: 500 }).notNull(),
  archiveHash: varchar("archive_hash", { length: 128 }).notNull(),
  encryptionKeyId: varchar("encryption_key_id", { length: 255 }).notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  totalSales: integer("total_sales").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id").notNull(),
  buyerWallet: varchar("buyer_wallet", { length: 255 }),
  buyerEmail: varchar("buyer_email", { length: 255 }),
  creatorId: uuid("creator_id").notNull(),
  protocol: varchar("protocol", { length: 10 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  creatorPayout: decimal("creator_payout", { precision: 10, scale: 2 }).notNull(),
  chain: varchar("chain", { length: 50 }),
  txHash: varchar("tx_hash", { length: 255 }),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  mppSessionId: varchar("mpp_session_id", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

const licenses = pgTable("licenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().unique(),
  skillId: uuid("skill_id").notNull(),
  buyerWallet: varchar("buyer_wallet", { length: 255 }),
  buyerEmail: varchar("buyer_email", { length: 255 }),
  licenseKeyHash: varchar("license_key_hash", { length: 255 }).notNull().unique(),
  downloadsRemaining: integer("downloads_remaining").default(5),
  expiresAt: timestamp("expires_at"),
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// ── Input validation ───────────────────────────────────────────────────────────
const PurchaseSchema = z.object({
  session_id: z.string().uuid("session_id must be a valid UUID"),
  skill_id: z.string().uuid("skill_id must be a valid UUID"),
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
    const parseResult = PurchaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { session_id, skill_id } = parseResult.data;

    const db = getDb();

    // ── Validate session ───────────────────────────────────────────────────
    const sessionRows = await db
      .select()
      .from(mppSessions)
      .where(eq(mppSessions.id, session_id))
      .limit(1);

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: "MPP session not found" });
    }

    const session = sessionRows[0];

    if (session.status !== "active") {
      return res.status(400).json({ error: "MPP session is not active" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return res.status(400).json({ error: "MPP session has expired" });
    }

    const spendingLimit = parseFloat(session.spendingLimit ?? "0");
    const amountSpent = parseFloat(session.amountSpent ?? "0");
    const remainingBalance = spendingLimit - amountSpent;

    // ── Validate skill ─────────────────────────────────────────────────────
    const skillRows = await db
      .select()
      .from(privateSkills)
      .where(and(eq(privateSkills.id, skill_id), eq(privateSkills.isActive, true)))
      .limit(1);

    if (skillRows.length === 0) {
      return res.status(404).json({ error: "Skill not found or not available" });
    }

    const skill = skillRows[0];
    const priceUsd = parseFloat(skill.priceUsd ?? "0");

    if (priceUsd > remainingBalance) {
      return res.status(400).json({
        error: "Insufficient balance",
        price_usd: priceUsd.toFixed(2),
        remaining_balance: remainingBalance.toFixed(2),
      });
    }

    // ── Create transaction ─────────────────────────────────────────────────
    const platformFee = (priceUsd * 0.05).toFixed(2);
    const creatorPayout = (priceUsd * 0.95).toFixed(2);

    const txRows = await db
      .insert(transactions)
      .values({
        skillId: skill.id,
        creatorId: skill.creatorId,
        buyerEmail: session.buyerEmail,
        protocol: "mpp",
        amountUsd: priceUsd.toFixed(2),
        platformFee,
        creatorPayout,
        mppSessionId: session_id,
        status: "confirmed",
        confirmedAt: new Date(),
      })
      .returning({ id: transactions.id });

    const transactionId = txRows[0].id;

    // ── Generate license key ───────────────────────────────────────────────
    const rawKey = crypto.randomBytes(24).toString("base64url");
    const keyHash = sha256(rawKey);

    await db.insert(licenses).values({
      transactionId,
      skillId: skill.id,
      buyerEmail: session.buyerEmail,
      licenseKeyHash: keyHash,
      downloadsRemaining: 5,
    });

    // ── Update session: increment amount_spent ─────────────────────────────
    const newAmountSpent = (amountSpent + priceUsd).toFixed(2);
    await db
      .update(mppSessions)
      .set({
        amountSpent: newAmountSpent,
      })
      .where(eq(mppSessions.id, session_id));

    // ── Update skill: increment total_sales and total_revenue ──────────────
    await db
      .update(privateSkills)
      .set({
        totalSales: sql`${privateSkills.totalSales} + 1`,
        totalRevenue: sql`${privateSkills.totalRevenue} + ${priceUsd.toFixed(2)}`,
      })
      .where(eq(privateSkills.id, skill.id));

    const newRemainingBalance = remainingBalance - priceUsd;

    return res.status(200).json({
      transaction_id: transactionId,
      license_key: rawKey,
      skill_name: skill.name,
      amount_charged: priceUsd.toFixed(2),
      remaining_balance: newRemainingBalance.toFixed(2),
    });
  } catch (err: unknown) {
    console.error("mpp purchase error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
