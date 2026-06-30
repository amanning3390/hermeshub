/**
 * GET/POST /api/v1/cron/health-check — agent health check cron.
 *
 * Pings each agent's actual endpointUrl. If no endpointUrl is provided,
 * the agent defaults to 'unknown' status (we can't verify what we can't reach).
 *
 * Status mapping:
 *   - 200 OK               → 'online'
 *   - Non-200 or timeout    → 'offline'
 *   - 3+ consecutive failures → 'stale'
 *   - No endpointUrl        → 'unknown'
 *
 * Protected by CRON_SECRET env var.
 */
import { eq, isNotNull, is, and, ne } from "drizzle-orm";
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
 * Ping an agent's actual endpoint URL. This is NOT our own server —
 * it's the URL the agent owner provided at registration (e.g. their
 * actual service running on their infrastructure).
 */
async function pingAgentUrl(url: string): Promise<{ ok: boolean; statusCode: number | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(url, {
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

function computeHealthStatus(
  currentStatus: string,
  checkOk: boolean,
): "online" | "offline" | "stale" {
  if (checkOk) return "online";
  if (currentStatus === "offline" || currentStatus === "stale") return "stale";
  return "offline";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!isCronAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const method = (req.method ?? "").toUpperCase();
  if (method !== "GET" && method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const db = getDb();

  // Only check agents that HAVE an endpoint URL
  const checkableAgents = await db
    .select({
      id: agents.id,
      handle: agents.handle,
      endpointUrl: agents.endpointUrl,
      healthStatus: agents.healthStatus,
    })
    .from(agents)
    .where(isNotNull(agents.endpointUrl));

  const results: { id: string; handle: string; healthStatus: string; statusCode: number | null }[] = [];

  for (const agent of checkableAgents) {
    if (!agent.endpointUrl) continue;

    const { ok, statusCode } = await pingAgentUrl(agent.endpointUrl);
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
    skipped: "agents without endpointUrl are not checked",
    results,
    checkedAt: new Date().toISOString(),
  });
}
