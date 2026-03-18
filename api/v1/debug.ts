/**
 * GET /api/v1/debug
 * Temporary diagnostic endpoint - returns environment and DB connection status.
 * DELETE AFTER DEBUGGING.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const checks: Record<string, unknown> = {
    node_version: process.version,
    has_database_url: !!process.env.DATABASE_URL,
    database_url_length: process.env.DATABASE_URL?.length || 0,
    database_url_preview: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.substring(0, 30) + "..."
      : "NOT SET",
  };

  // Test neon import
  try {
    const { neon } = await import("@neondatabase/serverless");
    checks.neon_imported = true;
    checks.neon_type = typeof neon;
  } catch (e: any) {
    checks.neon_imported = false;
    checks.neon_error = e.message;
  }

  // Test drizzle import
  try {
    const { drizzle } = await import("drizzle-orm/neon-http");
    checks.drizzle_imported = true;
    checks.drizzle_type = typeof drizzle;
  } catch (e: any) {
    checks.drizzle_imported = false;
    checks.drizzle_error = e.message;
  }

  // Test DB connection
  try {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);
    const { sql: rawSql } = await import("drizzle-orm");
    const result = await db.execute(rawSql`SELECT 1 as test`);
    checks.db_connection = "SUCCESS";
    checks.db_rows = result.rows;
  } catch (e: any) {
    checks.db_connection = "FAILED";
    checks.db_error = e.message;
    checks.db_stack = e.stack?.split("\n").slice(0, 5);
  }

  res.status(200).json(checks);
}
