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
// Manual JWT helpers (HS256, no external package needed)
// ---------------------------------------------------------------------------
function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
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

  const ERROR_REDIRECT = "https://hermeshub.xyz/#/creator/login?error=auth_failed";

  if (req.method !== "GET") {
    return res.redirect(302, ERROR_REDIRECT);
  }

  const { code, state } = req.query as { code?: string; state?: string };

  if (!code) {
    return res.redirect(302, ERROR_REDIRECT);
  }

  // Optional: validate CSRF state cookie
  const cookies = parseCookies(req.headers.cookie ?? "");
  const cookieState = cookies["oauth_state"];
  if (cookieState && state && cookieState !== state) {
    return res.redirect(302, ERROR_REDIRECT);
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const jwtSecret = process.env.JWT_SECRET;

    if (!clientId || !clientSecret || !jwtSecret) {
      throw new Error("Missing required environment variables");
    }

    // ------------------------------------------------------------------
    // 1. Exchange code for access token
    // ------------------------------------------------------------------
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: "https://hermeshub.xyz/api/v1/auth/github/callback",
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token || tokenData.error) {
      throw new Error(`GitHub token error: ${tokenData.error ?? "unknown"}`);
    }

    const accessToken = tokenData.access_token;

    // ------------------------------------------------------------------
    // 2. Fetch GitHub user profile
    // ------------------------------------------------------------------
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "HermesHub",
      },
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub user fetch failed: ${userResponse.status}`);
    }

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
      email?: string | null;
      avatar_url?: string;
      bio?: string | null;
    };

    // Fetch emails separately if email is not public
    let email = githubUser.email ?? null;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "HermesHub",
        },
      });
      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email ?? emails[0]?.email ?? null;
      }
    }

    const githubId = String(githubUser.id);
    const githubUsername = githubUser.login;
    const avatarUrl = githubUser.avatar_url ?? null;
    const bio = githubUser.bio ?? null;

    // ------------------------------------------------------------------
    // 3. Upsert creator in DB
    // ------------------------------------------------------------------
    const db = getDb();

    const existing = await db
      .select()
      .from(creators)
      .where(eq(creators.githubId, githubId))
      .limit(1);

    let creatorId: string;

    if (existing.length > 0) {
      // Update existing creator
      await db
        .update(creators)
        .set({
          githubUsername,
          email: email ?? existing[0].email,
          avatarUrl: avatarUrl ?? existing[0].avatarUrl,
          bio: bio ?? existing[0].bio,
          updatedAt: new Date(),
        })
        .where(eq(creators.githubId, githubId));
      creatorId = existing[0].id;
    } else {
      // Insert new creator
      const inserted = await db
        .insert(creators)
        .values({
          githubId,
          githubUsername,
          email,
          avatarUrl,
          bio,
        })
        .returning({ id: creators.id });
      creatorId = inserted[0].id;
    }

    // ------------------------------------------------------------------
    // 4. Generate JWT (7-day expiry)
    // ------------------------------------------------------------------
    const SEVEN_DAYS = 7 * 24 * 60 * 60;
    const jwt = signJwt(
      { creatorId, githubId, githubUsername },
      jwtSecret,
      SEVEN_DAYS
    );

    // Clear the state cookie
    res.setHeader(
      "Set-Cookie",
      "oauth_state=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure"
    );

    // ------------------------------------------------------------------
    // 5. Redirect to frontend with token
    // ------------------------------------------------------------------
    return res.redirect(
      302,
      `https://hermeshub.xyz/#/creator/dashboard?token=${encodeURIComponent(jwt)}`
    );
  } catch (err) {
    console.error("[auth/callback] Error:", err);
    return res.redirect(302, ERROR_REDIRECT);
  }
}

// ---------------------------------------------------------------------------
// Cookie parser helper
// ---------------------------------------------------------------------------
function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key.trim()] = decodeURIComponent(rest.join("=").trim());
  }
  return result;
}
