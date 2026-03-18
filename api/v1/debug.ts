/**
 * GET /api/v1/debug
 * Temporary diagnostic endpoint v2 - test the same imports as stats.ts.
 * DELETE AFTER DEBUGGING.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const checks: Record<string, unknown> = {};

  // Step 1: Test schema import
  try {
    const schema = await import("../../api/_lib/schema");
    checks.schema_imported = true;
    checks.schema_keys = Object.keys(schema);
    checks.has_feedbackAggregates = !!schema.feedbackAggregates;
  } catch (e: any) {
    checks.schema_imported = false;
    checks.schema_error = e.message;
    checks.schema_stack = e.stack?.split("\n").slice(0, 8);
    return res.status(200).json(checks);
  }

  // Step 2: Test db import
  try {
    const { getDb } = await import("../../api/_lib/db");
    checks.db_imported = true;
    checks.db_type = typeof getDb;
  } catch (e: any) {
    checks.db_imported = false;
    checks.db_error = e.message;
    checks.db_stack = e.stack?.split("\n").slice(0, 8);
    return res.status(200).json(checks);
  }

  // Step 3: Test the exact query from stats.ts
  try {
    const { getDb } = await import("../../api/_lib/db");
    const { feedbackAggregates } = await import("../../api/_lib/schema");
    const db = getDb();
    const aggregates = await db.select().from(feedbackAggregates);
    checks.query_success = true;
    checks.aggregate_count = aggregates.length;
  } catch (e: any) {
    checks.query_success = false;
    checks.query_error = e.message;
    checks.query_stack = e.stack?.split("\n").slice(0, 8);
  }

  // Step 4: Test setCors import
  try {
    const { setCors } = await import("../../api/_lib/cors");
    checks.cors_imported = true;
  } catch (e: any) {
    checks.cors_imported = false;
    checks.cors_error = e.message;
  }

  res.status(200).json(checks);
}
