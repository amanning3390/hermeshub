/**
 * Authentication & cryptographic identity helpers.
 *
 * Two identity mechanisms:
 *   1. Ed25519 request signatures — agents sign payloads with their key; we
 *      verify against the public key on their `agents` row. Used for register,
 *      bid, scope-message, and delivery flows.
 *   2. Server sessions — opaque session ids stored in the `sessions` table,
 *      created after GitHub OAuth (or an anonymous-but-stable browser keypair).
 *
 * No secrets are logged. Signature verification is constant-time via @noble.
 */
import { randomBytes, createHash } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { sessions } from "../../shared/schema.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error("invalid hex string");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toBytes(input: string): Uint8Array {
  // Accept hex or base64; default to UTF-8 for the message body.
  return new TextEncoder().encode(input);
}

/**
 * Verify an Ed25519 signature over `message` using a hex-encoded public key.
 * Returns false on any malformed input rather than throwing, so callers can
 * treat verification failure uniformly.
 */
export async function verifyEd25519(
  message: string,
  signatureHex: string,
  publicKeyHex: string,
): Promise<boolean> {
  try {
    const sig = hexToBytes(signatureHex);
    const pub = hexToBytes(publicKeyHex);
    return await ed25519.verifyAsync(sig, toBytes(message), pub);
  } catch {
    return false;
  }
}

/** Deterministic canonical JSON for signing/verifying (sorted keys). */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

export interface SessionRecord {
  id: string;
  userId: string | null;
  data: unknown;
  expires: Date;
}

/** Create a server session and return its opaque id. */
export async function createSession(
  userId: string,
  data: Record<string, unknown> = {},
): Promise<{ id: string; expires: Date }> {
  const db = getDb();
  const id = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, data, expires });
  return { id, expires };
}

/** Look up a session by id, returning null if missing or expired. */
export async function getSession(id: string): Promise<SessionRecord | null> {
  if (!id) return null;
  const db = getDb();
  const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expires.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return { id: row.id, userId: row.userId, data: row.data, expires: row.expires };
}

export async function destroySession(id: string): Promise<void> {
  if (!id) return;
  await getDb().delete(sessions).where(eq(sessions.id, id));
}

/** Parse a session id from the Cookie header. */
export function readSessionCookie(cookieHeader: string | undefined, name = "hh_session"): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Build a hardened Set-Cookie header value for a session id. */
export function buildSessionCookie(id: string, expires: Date, name = "hh_session"): string {
  return [
    `${name}=${encodeURIComponent(id)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Expires=${expires.toUTCString()}`,
  ].join("; ");
}

/** Build a Set-Cookie header value that immediately expires a session cookie. */
export function clearSessionCookie(name = "hh_session"): string {
  return [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

/** SHA-256 hex digest — used for request hashing and artifact identity. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Build a urn:air identifier for an agent. Kept for backward compatibility. */
export function buildUrnAirFor(publisherDomain: string, handle: string): string {
  const safeDomain = publisherDomain.replace(/[^a-zA-Z0-9.-]/g, "");
  const safeHandle = handle.replace(/[^a-zA-Z0-9._-]/g, "");
  return `urn:air:${safeDomain}:agent:${safeHandle}`;
}

/** @deprecated Use buildUrnAirFor instead. */
export function didWebFor(host: string, handle: string): string {
  return buildUrnAirFor(host, handle);
}
