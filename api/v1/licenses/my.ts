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

  const wallet = req.query.wallet as string | undefined;
  const email = req.query.email as string | undefined;

  if (!wallet && !email) {
    return res.status(400).json({
      error: "At least one of `wallet` or `email` query parameters is required",
    });
  }

  try {
    const db = getDb();

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
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
