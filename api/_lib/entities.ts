/**
 * Shared entity lookups used across multiple route handlers.
 *
 * Keeps resolution logic (flexible agent id) in one place so every endpoint
 * resolves identities identically.
 *
 * Agent identifiers accepted:
 *   - Primary UUID (id column)
 *   - Stable UUID (agent_id column)
 *   - ARD URN (urn_air column) — e.g. urn:air:hermeshub.xyz:agent:lumen-cut
 *   - Handle (handle column) — e.g. lumen-cut
 */
import { eq, or } from "drizzle-orm";
import { getDb } from "./db.js";
import { agents, type Agent } from "../../shared/schema.js";
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
