import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// DB connection (singleton per warm function invocation)
// ---------------------------------------------------------------------------
let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  _db = drizzle(neon(url));
  return _db;
}

// ---------------------------------------------------------------------------
// Inline schema — creators table
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Manual JWT verification helpers (HS256, no external package needed)
// ---------------------------------------------------------------------------
interface JwtPayload {
  creatorId: string;
  githubId: string;
  githubUsername: string;
  iat: number;
  exp: number;
}

function base64urlDecode(input: string): string {
  // Pad to multiple of 4 if needed
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Recompute signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(receivedSignature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid JWT signature");
  }

  // Decode and parse payload
  const payload = JSON.parse(base64urlDecode(encodedPayload)) as JwtPayload;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("JWT expired");
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ------------------------------------------------------------------
  // 1. Extract and verify Bearer token
  // ------------------------------------------------------------------
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: missing token" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: empty token" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: "JWT_SECRET not configured" });
  }

  let payload: JwtPayload;
  try {
    payload = verifyJwt(token, jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }

  // ------------------------------------------------------------------
  // 2. Query creator profile from DB
  // ------------------------------------------------------------------
  try {
    const db = getDb();

    const rows = await db
      .select({
        id: creators.id,
        githubUsername: creators.githubUsername,
        email: creators.email,
        avatarUrl: creators.avatarUrl,
        walletAddress: creators.walletAddress,
        walletChain: creators.walletChain,
        solanaAddress: creators.solanaAddress,
        stripeAccountId: creators.stripeAccountId,
        verified: creators.verified,
        createdAt: creators.createdAt,
      })
      .from(creators)
      .where(eq(creators.id, payload.creatorId))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Creator not found" });
    }

    const creator = rows[0];

    return res.status(200).json({
      id: creator.id,
      github_username: creator.githubUsername,
      email: creator.email,
      avatar_url: creator.avatarUrl,
      wallet_address: creator.walletAddress,
      wallet_chain: creator.walletChain,
      solana_address: creator.solanaAddress,
      stripe_account_id: creator.stripeAccountId,
      verified: creator.verified,
      created_at: creator.createdAt,
    });
  } catch (err) {
    console.error("[auth/me] DB error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
