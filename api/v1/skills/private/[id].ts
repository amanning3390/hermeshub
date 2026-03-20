import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
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

// ─── Validation Schema for PUT ────────────────────────────────────────────────
const updateSkillSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  version: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
  price_usd: z.number().min(0.50).max(999.99).optional(),
  accepted_protocols: z.array(z.string()).optional(),
  accepted_chains: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid id parameter" });
  }

  switch (req.method) {
    case "GET":
      return handleGet(req, res, id);
    case "PUT":
      return handlePut(req, res, id);
    case "DELETE":
      return handleDelete(req, res, id);
    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}

// ─── GET: Public skill detail ─────────────────────────────────────────────────
async function handleGet(
  _req: VercelRequest,
  res: VercelResponse,
  id: string
) {
  try {
    const db = getDb();

    const [skill] = await db
      .select({
        id: privateSkills.id,
        creatorId: privateSkills.creatorId,
        slug: privateSkills.slug,
        name: privateSkills.name,
        description: privateSkills.description,
        shortDescription: privateSkills.shortDescription,
        version: privateSkills.version,
        category: privateSkills.category,
        priceUsd: privateSkills.priceUsd,
        acceptedProtocols: privateSkills.acceptedProtocols,
        acceptedChains: privateSkills.acceptedChains,
        fileSizeBytes: privateSkills.fileSizeBytes,
        totalSales: privateSkills.totalSales,
        totalRevenue: privateSkills.totalRevenue,
        isActive: privateSkills.isActive,
        createdAt: privateSkills.createdAt,
        updatedAt: privateSkills.updatedAt,
        // Creator info via join
        creatorGithubUsername: creators.githubUsername,
        creatorAvatarUrl: creators.avatarUrl,
      })
      .from(privateSkills)
      .leftJoin(creators, eq(privateSkills.creatorId, creators.id))
      .where(eq(privateSkills.id, id))
      .limit(1);

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    return res.status(200).json({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      short_description: skill.shortDescription,
      version: skill.version,
      category: skill.category,
      price_usd: skill.priceUsd,
      accepted_protocols: skill.acceptedProtocols,
      accepted_chains: skill.acceptedChains,
      file_size_bytes: skill.fileSizeBytes,
      total_sales: skill.totalSales,
      total_revenue: skill.totalRevenue,
      is_active: skill.isActive,
      created_at: skill.createdAt,
      updated_at: skill.updatedAt,
      creator: {
        id: skill.creatorId,
        github_username: skill.creatorGithubUsername,
        avatar_url: skill.creatorAvatarUrl,
      },
    });
  } catch (err) {
    console.error("[GET /skills/private/:id] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── PUT: Authenticated skill update ─────────────────────────────────────────
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  id: string
) {
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

  // Validate body
  const parseResult = updateSkillSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parseResult.error.flatten(),
    });
  }

  const {
    name,
    description,
    short_description,
    version,
    category,
    price_usd,
    accepted_protocols,
    accepted_chains,
    is_active,
  } = parseResult.data;

  try {
    const db = getDb();

    // Verify the skill exists and belongs to this creator
    const [existing] = await db
      .select({ id: privateSkills.id, creatorId: privateSkills.creatorId })
      .from(privateSkills)
      .where(eq(privateSkills.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Skill not found" });
    }
    if (existing.creatorId !== jwtPayload.creatorId) {
      return res.status(403).json({ error: "You do not own this skill" });
    }

    // Build update payload from only provided fields
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (short_description !== undefined) updatePayload.shortDescription = short_description;
    if (version !== undefined) updatePayload.version = version;
    if (category !== undefined) updatePayload.category = category;
    if (price_usd !== undefined) updatePayload.priceUsd = price_usd.toFixed(2);
    if (accepted_protocols !== undefined) updatePayload.acceptedProtocols = accepted_protocols;
    if (accepted_chains !== undefined) updatePayload.acceptedChains = accepted_chains;
    if (is_active !== undefined) updatePayload.isActive = is_active;

    const [updated] = await db
      .update(privateSkills)
      .set(updatePayload)
      .where(and(eq(privateSkills.id, id), eq(privateSkills.creatorId, jwtPayload.creatorId)))
      .returning();

    return res.status(200).json(updated);
  } catch (err) {
    console.error("[PUT /skills/private/:id] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── DELETE: Authenticated soft-delete ───────────────────────────────────────
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  id: string
) {
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

  try {
    const db = getDb();

    // Verify the skill exists and belongs to this creator
    const [existing] = await db
      .select({ id: privateSkills.id, creatorId: privateSkills.creatorId })
      .from(privateSkills)
      .where(eq(privateSkills.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Skill not found" });
    }
    if (existing.creatorId !== jwtPayload.creatorId) {
      return res.status(403).json({ error: "You do not own this skill" });
    }

    // Soft-delete: set is_active = false and update updated_at
    const [deactivated] = await db
      .update(privateSkills)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(privateSkills.id, id), eq(privateSkills.creatorId, jwtPayload.creatorId)))
      .returning({
        id: privateSkills.id,
        name: privateSkills.name,
        slug: privateSkills.slug,
        isActive: privateSkills.isActive,
        updatedAt: privateSkills.updatedAt,
      });

    return res.status(200).json({
      message: "Skill deactivated successfully",
      skill: deactivated,
    });
  } catch (err) {
    console.error("[DELETE /skills/private/:id] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
