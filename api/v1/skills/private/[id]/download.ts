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

// ── Helpers ────────────────────────────────────────────────────────────────────
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function usdToUsdc(priceUsd: string): string {
  // USDC has 6 decimals
  const usd = parseFloat(priceUsd);
  return Math.round(usd * 1_000_000).toString();
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-License-Key, X-PAYMENT");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Disable caching — every request must be fresh (license checks, payment gates)
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const skillId = req.query.id as string;
  if (!skillId) {
    return res.status(400).json({ error: "Missing skill id" });
  }

  try {
    const db = getDb();

    // Fetch skill + creator info
    const rows = await db
      .select({
        skillId: privateSkills.id,
        skillName: privateSkills.name,
        priceUsd: privateSkills.priceUsd,
        archiveUrl: privateSkills.archiveUrl,
        isActive: privateSkills.isActive,
        creatorId: creators.id,
        walletAddress: creators.walletAddress,
        walletChain: creators.walletChain,
      })
      .from(privateSkills)
      .innerJoin(creators, eq(privateSkills.creatorId, creators.id))
      .where(eq(privateSkills.id, skillId))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }

    const skill = rows[0];

    if (!skill.isActive) {
      return res.status(410).json({ error: "Skill is no longer available" });
    }

    const licenseKeyHeader = req.headers["x-license-key"] as string | undefined;
    const paymentHeader = req.headers["x-payment"] as string | undefined;

    // ── Branch 1: License key provided ──────────────────────────────────────
    if (licenseKeyHeader) {
      const keyHash = sha256(licenseKeyHeader);

      const licenseRows = await db
        .select()
        .from(licenses)
        .where(
          and(
            eq(licenses.licenseKeyHash, keyHash),
            eq(licenses.skillId, skillId),
            eq(licenses.revoked, false)
          )
        )
        .limit(1);

      if (licenseRows.length === 0) {
        return res.status(403).json({ error: "Invalid or revoked license key" });
      }

      const license = licenseRows[0];

      if (license.downloadsRemaining !== null && license.downloadsRemaining <= 0) {
        return res.status(403).json({ error: "No downloads remaining on this license" });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.status(403).json({ error: "License has expired" });
      }

      // Decrement downloads_remaining
      await db
        .update(licenses)
        .set({
          downloadsRemaining: sql`${licenses.downloadsRemaining} - 1`,
        })
        .where(eq(licenses.id, license.id));

      return res.status(200).json({
        download_url: skill.archiveUrl,
        skill_name: skill.skillName,
        downloads_remaining: (license.downloadsRemaining ?? 1) - 1,
        message: "Download authorized",
      });
    }

    // ── Branch 2: x402 payment proof provided ───────────────────────────────
    if (paymentHeader) {
      // Phase 1: simulate payment verification
      // In production, verify the on-chain payment proof here.

      const priceUsd = parseFloat(skill.priceUsd ?? "0");
      const platformFee = (priceUsd * 0.05).toFixed(2);
      const creatorPayout = (priceUsd * 0.95).toFixed(2);

      // Extract buyer wallet from payment header (simulated: treat header value as wallet or use placeholder)
      let buyerWallet: string | null = null;
      try {
        const parsed = JSON.parse(paymentHeader);
        buyerWallet = parsed.from || parsed.buyer || null;
      } catch {
        buyerWallet = null;
      }

      // Insert transaction
      const txRows = await db
        .insert(transactions)
        .values({
          skillId: skill.skillId,
          creatorId: skill.creatorId,
          buyerWallet,
          protocol: "x402",
          amountUsd: priceUsd.toFixed(2),
          platformFee,
          creatorPayout,
          chain: skill.walletChain ?? "base",
          txHash: `simulated_${crypto.randomBytes(16).toString("hex")}`,
          status: "confirmed",
          confirmedAt: new Date(),
        })
        .returning({ id: transactions.id });

      const transactionId = txRows[0].id;

      // Generate license key
      const rawKey = crypto.randomBytes(24).toString("base64url");
      const keyHash = sha256(rawKey);

      // Insert license
      await db.insert(licenses).values({
        transactionId,
        skillId: skill.skillId,
        buyerWallet,
        licenseKeyHash: keyHash,
        downloadsRemaining: 5,
      });

      // Increment total_sales and total_revenue
      await db
        .update(privateSkills)
        .set({
          totalSales: sql`${privateSkills.totalSales} + 1`,
          totalRevenue: sql`${privateSkills.totalRevenue} + ${priceUsd.toFixed(2)}`,
        })
        .where(eq(privateSkills.id, skill.skillId));

      return res.status(200).json({
        license_key: rawKey,
        download_url: skill.archiveUrl,
        message: "Purchase successful",
      });
    }

    // ── Branch 3: No credentials — return 402 payment required ──────────────
    // Always use the production domain — VERCEL_URL resolves to preview domains
    const downloadUrl = `https://hermeshub.xyz/api/v1/skills/private/${skillId}/download`;

    return res.status(402).json({
      status: 402,
      x402Version: "2",
      accepts: [
        {
          scheme: "exact",
          network: skill.walletChain ?? "base",
          maxAmountRequired: usdToUsdc(skill.priceUsd ?? "0"),
          resource: downloadUrl,
          description: `Purchase ${skill.skillName}`,
          mimeType: "application/zip",
          payTo: skill.walletAddress ?? "",
          maxTimeoutSeconds: 300,
          extra: {
            skillId: skill.skillId,
            creatorId: skill.creatorId,
          },
        },
      ],
    });
  } catch (err: unknown) {
    console.error("download error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
