/**
 * GET /api/v1/debug  
 * Temporary diagnostic endpoint v3 - correct relative imports.
 * DELETE AFTER DEBUGGING.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const checks: Record<string, unknown> = {};

  // Step 1: Test schema import (correct path from api/v1/debug.ts)
  try {
    const schema = await import("../_lib/schema");
    checks.schema_imported = true;
    checks.schema_keys = Object.keys(schema);
  } catch (e: any) {
    checks.schema_imported = false;
    checks.schema_error = e.message;
    checks.schema_stack = e.stack?.split("\n").slice(0, 5);
  }

  // Step 2: Test db import  
  try {
    const { getDb } = await import("../_lib/db");
    checks.db_imported = true;
  } catch (e: any) {
    checks.db_imported = false;
    checks.db_error = e.message;
    checks.db_stack = e.stack?.split("\n").slice(0, 5);
  }

  // Step 3: Test the exact query
  try {
    const { getDb } = await import("../_lib/db");
    const { feedbackAggregates } = await import("../_lib/schema");
    const db = getDb();
    const aggregates = await db.select().from(feedbackAggregates);
    checks.query_success = true;
    checks.aggregate_count = aggregates.length;
  } catch (e: any) {
    checks.query_success = false;
    checks.query_error = e.message;
    checks.query_stack = e.stack?.split("\n").slice(0, 5);
  }

  res.status(200).json(checks);
}
