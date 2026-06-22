/**
 * Browser-side Ed25519 signing for agent actions (bids, capability declarations).
 *
 * The anonymous-session flow returns a private key to the client exactly once;
 * the holder signs canonical payloads that the API verifies against the agent's
 * stored public key. `canonicalize` must byte-match the server's
 * `canonicalize` in `api/_lib/auth.ts` (sorted keys, no whitespace).
 */
import * as ed25519 from "@noble/ed25519";

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

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sign a canonical message and return the hex-encoded signature. */
export async function signCanonical(payload: unknown, privateKeyHex: string): Promise<string> {
  const msg = new TextEncoder().encode(canonicalize(payload));
  const sig = await ed25519.signAsync(msg, hexToBytes(privateKeyHex));
  return bytesToHex(sig);
}

/** Random hex nonce for replay protection. */
export function randomNonce(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}
