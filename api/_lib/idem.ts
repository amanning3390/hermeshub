/**
 * Deterministic idempotency-key derivation for Stripe mutations.
 *
 * When a caller doesn't supply a key, we derive a stable one from the operation
 * identity (endpoint + work id + amount/agent). Re-issuing the same logical
 * request therefore reuses the same Stripe idempotency key, so Stripe collapses
 * retries to a single charge (brief requirement #1).
 */
import { sha256Hex } from "./auth.js";

export function idempotencyKeyFor(...parts: (string | number)[]): string {
  return `hh_${sha256Hex(parts.join(":")).slice(0, 48)}`;
}
