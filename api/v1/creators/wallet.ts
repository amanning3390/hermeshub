import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
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

// ─── Schema ───────────────────────────────────────────────────────────────────
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

// ─── Validation Schema ────────────────────────────────────────────────────────
const walletUpdateSchema = z
  .object({
    wallet_address: z.string().optional(),
    wallet_chain: z
      .enum(["base", "solana", "ethereum", "tempo"])
      .optional(),
    solana_address: z.string().optional(),
    tempo_address: z.string().optional(),
  })
  .refine(
    (data) =>
      data.wallet_address !== undefined || data.solana_address !== undefined,
    {
      message:
        "At least one of wallet_address or solana_address must be provided",
    }
  );

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "PUT") {
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
  const parseResult = walletUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parseResult.error.flatten(),
    });
  }

  const { wallet_address, wallet_chain, solana_address, tempo_address } =
    parseResult.data;

  try {
    const db = getDb();

    // Build update payload (only defined fields)
    const updatePayload: Partial<{
      walletAddress: string;
      walletChain: string;
      solanaAddress: string;
      tempoAddress: string;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (wallet_address !== undefined) updatePayload.walletAddress = wallet_address;
    if (wallet_chain !== undefined) updatePayload.walletChain = wallet_chain;
    if (solana_address !== undefined) updatePayload.solanaAddress = solana_address;
    if (tempo_address !== undefined) updatePayload.tempoAddress = tempo_address;

    const [updated] = await db
      .update(creators)
      .set(updatePayload)
      .where(eq(creators.id, jwtPayload.creatorId))
      .returning({
        id: creators.id,
        githubUsername: creators.githubUsername,
        avatarUrl: creators.avatarUrl,
        bio: creators.bio,
        walletAddress: creators.walletAddress,
        walletChain: creators.walletChain,
        solanaAddress: creators.solanaAddress,
        tempoAddress: creators.tempoAddress,
        verified: creators.verified,
        createdAt: creators.createdAt,
        updatedAt: creators.updatedAt,
      });

    if (!updated) {
      return res.status(404).json({ error: "Creator not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("[PUT /creators/wallet] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
