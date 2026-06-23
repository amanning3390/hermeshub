/**
 * GET /api/cron/federation-health — federation referral health check cron.
 *
 * Scheduled in vercel.json crons: every 6 hours (cron expr: 0 -slash-6-star etc).
 *
 * For each enabled federation referral:
 *   1. Fetches <referral_origin>/.well-known/ai-catalog.json with 5s timeout.
 *   2. Records result in referral_health_log.
 *   3. If consecutive_failures >= 3: sets enabled = false.
 *   4. On first success after failures: resets consecutive_failures to 0.
 *
 * Protected by Vercel cron signature header check. The CRON_SECRET env var
 * is compared against the Authorization: Bearer <secret> header.
 * (Vercel also sends x-vercel-cron-signature but Bearer is simpler to validate.)
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../_lib/db.js";
import {
  federation_referrals,
  referral_health_log,
} from "../../shared/schema.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const HEALTH_CHECK_TIMEOUT_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;

/** Validate cron secret from Authorization header. */
function isCronAuthorized(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // No secret configured — allow in dev, block in production.
    if (process.env.VERCEL_ENV === "production") return false;
    return true;
  }
  const auth = req.headers["authorization"];
  return auth === `Bearer ${cronSecret}`;
}

async function pingReferral(url: string): Promise<{ statusCode: number | null; latencyMs: number; success: boolean }> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return { statusCode: null, latencyMs: 0, success: false };
  }

  const catalogUrl = `${origin}/.well-known/ai-catalog.json`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(catalogUrl, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "HermesHub-HealthCheck/1.0" },
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    const success = response.ok;
    return { statusCode: response.status, latencyMs, success };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return { statusCode: null, latencyMs, success: false };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!isCronAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const db = getDb();
  const referrals = await db
    .select()
    .from(federation_referrals)
    .where(eq(federation_referrals.enabled, true));

  const results: { id: string; displayName: string; success: boolean; statusCode: number | null }[] = [];

  for (const referral of referrals) {
    const { statusCode, latencyMs, success } = await pingReferral(referral.url);

    // Record health log entry.
    await db.insert(referral_health_log).values({
      referralId: referral.id,
      statusCode,
      latencyMs,
      success,
    });

    if (success) {
      // Reset failure counter on success.
      await db
        .update(federation_referrals)
        .set({
          consecutiveFailures: 0,
          lastHealthCheck: new Date(),
        })
        .where(eq(federation_referrals.id, referral.id));
    } else {
      const newFailures = referral.consecutiveFailures + 1;
      const shouldDisable = newFailures >= MAX_CONSECUTIVE_FAILURES;

      await db
        .update(federation_referrals)
        .set({
          consecutiveFailures: newFailures,
          lastHealthCheck: new Date(),
          enabled: shouldDisable ? false : true,
        })
        .where(eq(federation_referrals.id, referral.id));
    }

    results.push({
      id: referral.id,
      displayName: referral.displayName,
      success,
      statusCode,
    });
  }

  res.status(200).json({
    checked: results.length,
    results,
    checkedAt: new Date().toISOString(),
  });
}
