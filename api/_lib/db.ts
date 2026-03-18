/**
 * Shared database connection for Vercel Serverless Functions.
 * Uses Neon serverless driver + Drizzle ORM.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(url);
  _db = drizzle(sql);
  return _db;
}
