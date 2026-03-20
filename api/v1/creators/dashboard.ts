import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, sql } from "drizzle-orm";
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
import crypto from "crypto";

// ─── DB Connection ────────────────────────────────────────────────────────────
let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  _db = drizzle(neon(url));
  return _db;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: varchar("github_id", { length: 255 }).notNull().unique(),
  githubUsername: varchar("github_username", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  bio: text("bio"),
  walletAddress: varchar("wallet_address", { length: 255 }),
  walletChain: varchar("wallet_chain", { length: 50 }).default("base"),
  solanaAddress: varchar("solana_address", { length: 255 }),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  tempoAddress: varchar("tempo_address", { length: 255 }),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// ─── JWT Verification ─────────────────────────────────────────────────────────
function verifyJWT(
  token: string,
  secret: string
): { creatorId: string; githubId: string; githubUsername: string } | null {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");
    const sigBuf = Buffer.from(signatureB64, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    )
      return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
      return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server configuration error" });
  }
  const jwtPayload = verifyJWT(token, secret);
  if (!jwtPayload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const creatorId = jwtPayload.creatorId;

  try {
    const db = getDb();

    // Fetch all skills for this creator
    const skills = await db
      .select({
        id: privateSkills.id,
        name: privateSkills.name,
        slug: privateSkills.slug,
        priceUsd: privateSkills.priceUsd,
        totalSales: privateSkills.totalSales,
        totalRevenue: privateSkills.totalRevenue,
        isActive: privateSkills.isActive,
        createdAt: privateSkills.createdAt,
      })
      .from(privateSkills)
      .where(eq(privateSkills.creatorId, creatorId))
      .orderBy(desc(privateSkills.createdAt));

    // Aggregate stats from private_skills
    const [statsRow] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${privateSkills.totalRevenue}), 0)::text`,
        totalSales: sql<number>`coalesce(sum(${privateSkills.totalSales}), 0)::int`,
        activeListings: sql<number>`count(case when ${privateSkills.isActive} = true then 1 end)::int`,
      })
      .from(privateSkills)
      .where(eq(privateSkills.creatorId, creatorId));

    // Earnings broken down by protocol from transactions table
    const [earningsRow] = await db
      .select({
        totalEarningsX402: sql<string>`coalesce(sum(case when ${transactions.protocol} = 'x402' then ${transactions.creatorPayout} else 0 end), 0)::text`,
        totalEarningsMpp: sql<string>`coalesce(sum(case when ${transactions.protocol} = 'mpp' then ${transactions.creatorPayout} else 0 end), 0)::text`,
      })
      .from(transactions)
      .where(eq(transactions.creatorId, creatorId));

    // Recent 20 transactions for this creator
    const recentTransactions = await db
      .select({
        id: transactions.id,
        skillId: transactions.skillId,
        amountUsd: transactions.amountUsd,
        platformFee: transactions.platformFee,
        creatorPayout: transactions.creatorPayout,
        protocol: transactions.protocol,
        status: transactions.status,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.creatorId, creatorId))
      .orderBy(desc(transactions.createdAt))
      .limit(20);

    return res.status(200).json({
      skills,
      stats: {
        total_revenue: statsRow?.totalRevenue ?? "0",
        total_sales: statsRow?.totalSales ?? 0,
        active_listings: statsRow?.activeListings ?? 0,
        total_earnings_x402: earningsRow?.totalEarningsX402 ?? "0",
        total_earnings_mpp: earningsRow?.totalEarningsMpp ?? "0",
      },
      recent_transactions: recentTransactions,
    });
  } catch (err) {
    console.error("[GET /creators/dashboard] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
