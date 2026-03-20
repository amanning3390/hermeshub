import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, ilike, desc, asc, sql } from "drizzle-orm";
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

  try {
    const db = getDb();

    // Parse query params
    const typeFilter = (req.query.type as string) || "all";
    const category = req.query.category as string | undefined;
    const sort = (req.query.sort as string) || "newest";
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [eq(privateSkills.isActive, true)];

    if (category) {
      conditions.push(eq(privateSkills.category, category));
    }

    if (search) {
      conditions.push(
        sql`(${privateSkills.name} ILIKE ${"%" + search + "%"} OR ${privateSkills.shortDescription} ILIKE ${"%" + search + "%"})`
      );
    }

    // typeFilter: 'premium' or 'all' both return DB skills (free skills come from frontend static data)
    // 'free' filter returns nothing from DB since all DB skills are paid
    if (typeFilter === "free") {
      return res.status(200).json({ skills: [], total: 0, page, limit });
    }

    // Determine ORDER BY
    let orderByClause;
    switch (sort) {
      case "price_low":
        orderByClause = asc(privateSkills.priceUsd);
        break;
      case "price_high":
        orderByClause = desc(privateSkills.priceUsd);
        break;
      case "most_purchased":
        orderByClause = desc(privateSkills.totalSales);
        break;
      case "newest":
      default:
        orderByClause = desc(privateSkills.createdAt);
        break;
    }

    const whereClause = and(...conditions);

    // Count total
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(privateSkills)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Fetch skills with creator JOIN
    const rows = await db
      .select({
        id: privateSkills.id,
        slug: privateSkills.slug,
        name: privateSkills.name,
        shortDescription: privateSkills.shortDescription,
        category: privateSkills.category,
        priceUsd: privateSkills.priceUsd,
        acceptedProtocols: privateSkills.acceptedProtocols,
        totalSales: privateSkills.totalSales,
        createdAt: privateSkills.createdAt,
        creatorId: creators.id,
        creatorUsername: creators.githubUsername,
        creatorAvatar: creators.avatarUrl,
      })
      .from(privateSkills)
      .innerJoin(creators, eq(privateSkills.creatorId, creators.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const skills = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      short_description: row.shortDescription,
      category: row.category,
      price_usd: row.priceUsd,
      creator_id: row.creatorId,
      creator_username: row.creatorUsername,
      creator_avatar: row.creatorAvatar,
      total_sales: row.totalSales,
      accepted_protocols: row.acceptedProtocols,
      created_at: row.createdAt,
    }));

    return res.status(200).json({ skills, total, page, limit });
  } catch (err: unknown) {
    console.error("marketplace error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
