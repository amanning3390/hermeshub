import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, or } from "drizzle-orm";
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

// ── JWT Verification ──────────────────────────────────────────────────────────
function verifyJWT(
  token: string,
  secret: string
): { creatorId: string; githubId: string; githubUsername: string } | null {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    // SECURITY: Enforce HS256 algorithm to prevent algorithm confusion attacks
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    if (header.alg !== "HS256") return null;
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
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))
      return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Query validation ──────────────────────────────────────────────────────────
const querySchema = z.object({
  wallet: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
}).refine(
  (data) => data.wallet !== undefined || data.email !== undefined,
  { message: "At least one of wallet or email is required" }
);

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // SECURITY: Require JWT authentication to prevent arbitrary license enumeration
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

  // Validate query parameters
  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "At least one of `wallet` or `email` query parameters is required",
    });
  }

  const { wallet, email } = parseResult.data;

  try {
    const db = getDb();

    // SECURITY: Verify the authenticated creator owns the queried wallet/email
    const [creator] = await db
      .select({
        email: creators.email,
        walletAddress: creators.walletAddress,
        solanaAddress: creators.solanaAddress,
      })
      .from(creators)
      .where(eq(creators.id, jwtPayload.creatorId))
      .limit(1);

    if (!creator) {
      return res.status(404).json({ error: "Creator not found" });
    }

    // Only allow querying licenses for the authenticated user's own wallet/email
    if (email && creator.email !== email) {
      return res.status(403).json({ error: "You can only view your own licenses" });
    }
    if (wallet && wallet !== creator.walletAddress && wallet !== creator.solanaAddress) {
      return res.status(403).json({ error: "You can only view your own licenses" });
    }

    // Build the buyer filter: match on wallet OR email (whichever is provided)
    let buyerFilter;
    if (wallet && email) {
      buyerFilter = or(
        eq(licenses.buyerWallet, wallet),
        eq(licenses.buyerEmail, email)
      );
    } else if (wallet) {
      buyerFilter = eq(licenses.buyerWallet, wallet);
    } else {
      buyerFilter = eq(licenses.buyerEmail, email!);
    }

    // Join licenses → transactions → private_skills
    const rows = await db
      .select({
        licenseId: licenses.id,
        skillId: privateSkills.id,
        skillName: privateSkills.name,
        skillSlug: privateSkills.slug,
        licenseKeyHash: licenses.licenseKeyHash,
        downloadsRemaining: licenses.downloadsRemaining,
        expiresAt: licenses.expiresAt,
        revoked: licenses.revoked,
        purchasedAt: licenses.createdAt,
        protocol: transactions.protocol,
        amountPaid: transactions.amountUsd,
      })
      .from(licenses)
      .innerJoin(transactions, eq(licenses.transactionId, transactions.id))
      .innerJoin(privateSkills, eq(licenses.skillId, privateSkills.id))
      .where(buyerFilter);

    const result = rows.map((row) => ({
      license_id: row.licenseId,
      skill_id: row.skillId,
      skill_name: row.skillName,
      skill_slug: row.skillSlug,
      // Return only last 8 chars of the hash for reference (not the full hash)
      license_key_hash: row.licenseKeyHash
        ? row.licenseKeyHash.slice(-8)
        : null,
      downloads_remaining: row.downloadsRemaining,
      expires_at: row.expiresAt,
      revoked: row.revoked,
      purchased_at: row.purchasedAt,
      protocol: row.protocol,
      amount_paid: row.amountPaid,
    }));

    return res.status(200).json({ licenses: result, total: result.length });
  } catch (err: unknown) {
    console.error("licenses/my error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
