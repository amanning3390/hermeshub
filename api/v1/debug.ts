/**
 * GET /api/v1/debug  
 * V4 - static imports to replicate actual endpoint behavior.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/db";
import { feedbackAggregates } from "../_lib/schema";
import { setCors } from "../_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  try {
    const db = getDb();
    const aggregates = await db.select().from(feedbackAggregates);
    res.json({
      status: "ok",
      aggregate_count: aggregates.length,
      node_version: process.version,
    });
  } catch (e: any) {
    res.status(200).json({
      status: "error",
      error: e.message,
      stack: e.stack?.split("\n").slice(0, 8),
    });
  }
}
