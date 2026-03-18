/**
 * GET /api/v1/agents/:agentId
 * Get agent public profile.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db";
import { agents } from "../../_lib/schema";
import { setCors } from "../../_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { agentId } = req.query;
    if (!agentId || typeof agentId !== "string") {
      return res.status(400).json({ error: "invalid_agent_id" });
    }

    const db = getDb();
    const [agent] = await db.select().from(agents).where(eq(agents.agentId, agentId));

    if (!agent) {
      return res.status(404).json({ error: "agent_not_found" });
    }

    // Return public fields only (never expose publicKey or ownerHash)
    res.json({
      agent_id: agent.agentId,
      name: agent.name,
      model: agent.model,
      verified: agent.verified,
      trust_score: agent.trustScore,
      feedback_count: agent.feedbackCount,
      created_at: agent.createdAt,
    });
  } catch (e) {
    console.error("Agent lookup error:", e);
    res.status(500).json({ error: "internal_error" });
  }
}
