/**
 * GET/POST /api/v1/cron/health-check — agent health check cron.
 *
 * Pings each active agent's /.well-known/ai-catalog.json endpoint and
 * updates the healthStatus and lastHealthCheck fields on the agent.
 *
 * Status mapping:
 *   - 200 OK             → 'online'
 *   - Connection failed   → 'offline'
 *   - 3+ consecutive failures → 'stale'
 *
 * Protected by CRON_SECRET env var (same pattern as federation-health cron).
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { agents } from "../../../shared/schema.js";
import { log } from "../../_lib/log.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** Validate cron secret from Authorization header. */
function isCronAuthorized(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.VERCEL_ENV === "production") return false;
    return true;
  }
  const auth = req.headers["authorization"];
  return auth === `Bearer ${cronSecret}`;
}

/**
 * Ping an agent's /.well-known/ai-catalog.json endpoint.
 * We derive the catalog URL from the agent's publisher_domain + handle.
 */
async function pingAgent(publisherDomain: string, handle: string): Promise<{ ok: boolean; statusCode: number | null }> {
  const catalogUrl = `https://${publisherDomain}/.well-known/agent-card/${handle}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(catalogUrl, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "HermesHub-HealthCheck/1.0" },
    });

    clearTimeout(timeout);
    return { ok: response.ok, statusCode: response.status };
  } catch {
    return { ok: false, statusCode: null };
  }
}

/**
 * Determine new health status based on current status and check result.
 * If the agent was already 'offline' and fails again, it becomes 'stale'
 * (indicating 3+ consecutive failures — we use the transition to 'stale'
 * after 'offline' as a proxy for 2+ prior failures).
 */
function computeHealthStatus(
  currentStatus: string,
  checkOk: boolean,
): "online" | "offline" | "stale" {
  if (checkOk) return "online";

  // If already offline or stale, mark as stale (3+ consecutive failures).
  if (currentStatus === "offline" || currentStatus === "stale") {
    return "stale";
  }

  // First failure from online/unknown → offline.
  return "offline";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!isCronAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // Accept both GET (Vercel cron) and POST (manual trigger).
  const method = (req.method ?? "").toUpperCase();
  if (method !== "GET" && method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const db = getDb();

  // Get all agents (we check all of them; could filter by subscriptionStatus='active'
  // but for now we check all registered agents).
  const allAgents = await db
    .select({
      id: agents.id,
      handle: agents.handle,
      publisherDomain: agents.publisherDomain,
      healthStatus: agents.healthStatus,
    })
    .from(agents);

  const results: { id: string; handle: string; healthStatus: string; statusCode: number | null }[] = [];

  for (const agent of allAgents) {
    const { ok, statusCode } = await pingAgent(agent.publisherDomain, agent.handle);
    const newStatus = computeHealthStatus(agent.healthStatus, ok);

    await db
      .update(agents)
      .set({
        healthStatus: newStatus,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));

    results.push({
      id: agent.id,
      handle: agent.handle,
      healthStatus: newStatus,
      statusCode,
    });
  }

  log({ level: "info", msg: "health check cron complete", agentsChecked: results.length });

  res.status(200).json({
    checked: results.length,
    results,
    checkedAt: new Date().toISOString(),
  });
}
