/**
 * Idempotency ledger for mutating API surfaces (brief constraint #7).
 *
 * A caller supplies an `Idempotency-Key` header. We hash the request body and:
 *   - if the key is unseen, claim it (insert) and let the handler run, then
 *     store the response under the key;
 *   - if the key exists with a matching request hash, replay the stored response;
 *   - if the key exists with a *different* request hash, reject as a conflict
 *     (the same key was reused for a different payload).
 *
 * Keys expire via `ttlAt`; a periodic job (or lazy cleanup) prunes stale rows.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { idempotency_keys } from "../../shared/schema.js";
import { sha256Hex } from "./auth.js";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export type IdempotencyOutcome =
  | { kind: "fresh" }
  | { kind: "replay"; response: unknown }
  | { kind: "conflict" };

/**
 * Atomically claim an idempotency key for a given scope + request body.
 * `ON CONFLICT DO NOTHING` makes the insert the lock: exactly one caller wins
 * the fresh claim; concurrent replays read the stored row.
 */
export async function claimIdempotencyKey(
  key: string,
  scope: string,
  requestBody: unknown,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<IdempotencyOutcome> {
  const db = getDb();
  const requestHash = sha256Hex(`${scope}:${JSON.stringify(requestBody ?? null)}`);
  const ttlAt = new Date(Date.now() + ttlMs);

  const inserted = await db
    .insert(idempotency_keys)
    .values({ key, scope, requestHash, response: null, ttlAt })
    .onConflictDoNothing({ target: idempotency_keys.key })
    .returning({ key: idempotency_keys.key });

  if (inserted.length > 0) {
    return { kind: "fresh" };
  }

  // Key already exists — inspect it.
  const existing = await db
    .select()
    .from(idempotency_keys)
    .where(eq(idempotency_keys.key, key))
    .limit(1);

  const row = existing[0];
  if (!row) {
    // Race: row was pruned between insert and select. Treat as fresh retry.
    return { kind: "fresh" };
  }
  if (row.requestHash !== requestHash) {
    return { kind: "conflict" };
  }
  if (row.response == null) {
    // In-flight: the original request hasn't stored its response yet. Caller
    // should retry; surface as conflict to avoid double-executing the side effect.
    return { kind: "conflict" };
  }
  return { kind: "replay", response: row.response };
}

/** Persist the handler's response under a previously claimed key. */
export async function storeIdempotentResponse(key: string, response: unknown): Promise<void> {
  await getDb()
    .update(idempotency_keys)
    .set({ response: response as object })
    .where(eq(idempotency_keys.key, key));
}

/** Release a claimed key (e.g. if the handler failed and should be retryable). */
export async function releaseIdempotencyKey(key: string): Promise<void> {
  await getDb().delete(idempotency_keys).where(eq(idempotency_keys.key, key));
}
