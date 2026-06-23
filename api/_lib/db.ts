/**
 * Shared database client for Vercel serverless functions.
 *
 * Uses the Neon serverless HTTP driver + Drizzle ORM. The client is created once
 * per warm lambda and memoized. All queries go through Drizzle so values are
 * parameterized (no string concatenation, no SQL injection surface).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../../shared/schema.js";

export { schema };

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  _db = drizzle(neon(url), { schema });
  return _db;
}
