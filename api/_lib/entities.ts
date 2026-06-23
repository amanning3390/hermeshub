/**
 * Shared entity lookups used across multiple route handlers.
 *
 * Keeps resolution logic (flexible agent id, requester upsert) in one place so
 * every endpoint resolves identities identically.
 *
 * Agent identifiers accepted:
 *   - Primary UUID (id column)
 *   - Stable UUID (agent_id column)
 *   - ARD URN (urn_air column) — e.g. urn:air:hermeshub.xyz:agent:lumen-cut
 *   - Handle (handle column) — e.g. lumen-cut
 */
import { eq, or } from "drizzle-orm";
import { getDb } from "./db.js";
import {
  agents,
  requesters,
  work_requests,
  type Agent,
  type Requester,
  type WorkRequest,
} from "../../shared/schema.js";
import { ApiError } from "./http.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URN_AIR_RE = /^urn:air:/i;

/**
 * Resolve an agent by any of its public identifiers:
 * - primary UUID (id)
 * - stable UUID (agent_id)
 * - urn:air:... (urn_air)
 * - handle slug
 */
export async function findAgent(idOrUrn: string): Promise<Agent | null> {
  const db = getDb();
  const conditions = [
    eq(agents.urnAir, idOrUrn),
    eq(agents.handle, idOrUrn),
  ];
  if (UUID_RE.test(idOrUrn)) {
    conditions.push(eq(agents.id, idOrUrn), eq(agents.agentId, idOrUrn));
  }
  const rows = await db
    .select()
    .from(agents)
    .where(or(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireAgent(idOrUrn: string): Promise<Agent> {
  const agent = await findAgent(idOrUrn);
  if (!agent) throw new ApiError("NOT_FOUND", `agent not found: ${idOrUrn}`);
  return agent;
}

/** Load a work request by its public id, or throw 404. */
export async function requireWork(publicId: string): Promise<WorkRequest> {
  const rows = await getDb()
    .select()
    .from(work_requests)
    .where(eq(work_requests.publicId, publicId))
    .limit(1);
  if (!rows[0]) throw new ApiError("NOT_FOUND", `work not found: ${publicId}`);
  return rows[0];
}

/** Look up an existing requester by github_id, or create a bare one. */
export async function upsertRequesterByGithub(
  githubId: string,
  name?: string,
  email?: string,
): Promise<Requester> {
  const db = getDb();
  const existing = await db
    .select()
    .from(requesters)
    .where(eq(requesters.githubId, githubId))
    .limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(requesters)
    .values({ githubId, name, email })
    .onConflictDoNothing({ target: requesters.githubId })
    .returning();
  if (inserted[0]) return inserted[0];

  // Lost an insert race; re-read.
  const reread = await db
    .select()
    .from(requesters)
    .where(eq(requesters.githubId, githubId))
    .limit(1);
  if (!reread[0]) throw new ApiError("INTERNAL", "failed to upsert requester");
  return reread[0];
}

/**
 * Legacy: upsertRequesterByDid kept for backward compat with any callers that
 * still use didWeb-based requester creation. Creates by githubId if available,
 * otherwise inserts a nameless row keyed by the provided string as a name.
 */
export async function upsertRequesterByDid(didWeb: string, name?: string): Promise<Requester> {
  const db = getDb();
  // Derive a stable identifier: strip the did:web: prefix and use as name.
  const derivedName = name ?? didWeb.replace(/^did:web:/, "");
  const inserted = await db
    .insert(requesters)
    .values({ name: derivedName })
    .returning();
  return inserted[0];
}

/** Derive URL-safe handle from a name. Matches the DB backfill logic. */
export function handleFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "agent";
}

/** Build urn:air for a hermeshub-hosted agent. */
export function buildUrnAir(handle: string, publisherDomain = "hermeshub.xyz"): string {
  return `urn:air:${publisherDomain}:agent:${handle}`;
}
