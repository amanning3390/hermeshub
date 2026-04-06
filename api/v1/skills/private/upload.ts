import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
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

// ─── Slug Generator ───────────────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Validation Schema ────────────────────────────────────────────────────────
const uploadSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  version: z.string().min(1),
  category: z.string().max(100).optional(),
  price_usd: z.number().min(0.50).max(999.99),
  accepted_protocols: z.array(z.string()).optional().default(["x402", "mpp"]),
  accepted_chains: z.array(z.string()).optional().default(["base"]),
});

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
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

  // Validate body
  const parseResult = uploadSchema.safeParse(req.body);
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
  } = parseResult.data;

  const creatorId = jwtPayload.creatorId;

  try {
    const db = getDb();

    // Verify creator has at least one wallet configured
    const [creator] = await db
      .select({
        id: creators.id,
        walletAddress: creators.walletAddress,
        solanaAddress: creators.solanaAddress,
        tempoAddress: creators.tempoAddress,
      })
      .from(creators)
      .where(eq(creators.id, creatorId))
      .limit(1);

    if (!creator) {
      return res.status(401).json({ error: "Creator account not found" });
    }

    const hasWallet =
      (creator.walletAddress && creator.walletAddress.length > 0) ||
      (creator.solanaAddress && creator.solanaAddress.length > 0) ||
      (creator.tempoAddress && creator.tempoAddress.length > 0);

    if (!hasWallet) {
      return res.status(400).json({
        error: "You must configure at least one wallet address before listing skills",
      });
    }

    // Generate a unique slug (append random suffix to avoid collisions)
    const baseSlug = generateSlug(name);
    const uniqueSuffix = crypto.randomBytes(3).toString("hex");
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // Phase 1: placeholder values for upload-dependent fields
    // TODO(Phase 2): integrate Vercel Blob or S3 for actual file upload
    //   - Accept multipart/form-data with the skill archive (.zip)
    //   - Upload to blob storage, get real URL
    //   - Compute SHA-256 hash of the archive for integrity verification
    //   - Generate a unique encryption key for DRM
    const archiveUrl = "pending_upload";
    const archiveHash = crypto.randomBytes(32).toString("hex");
    const encryptionKeyId = "env_default";

    // Insert the skill
    const [created] = await db
      .insert(privateSkills)
      .values({
        creatorId,
        slug,
        name,
        description: description ?? null,
        shortDescription: short_description ?? null,
        version,
        category: category ?? null,
        priceUsd: price_usd.toFixed(2),
        acceptedProtocols: accepted_protocols,
        acceptedChains: accepted_chains,
        archiveUrl,
        archiveHash,
        encryptionKeyId,
        isActive: true,
      })
      .returning();

    return res.status(201).json({
      ...created,
      _notice: "Archive upload is Phase 2. The skill listing is created but the download URL is a placeholder. File storage integration coming soon.",
    });
  } catch (err) {
    console.error("[POST /skills/private/upload] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
