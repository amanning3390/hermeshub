/**
 * POST /api/v1/agents/register
 * Register a new agent identity with an Ed25519 public key.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db";
import { agents, agentRegistrationSchema } from "../../_lib/schema";
import { setCors } from "../../_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const parsed = agentRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "invalid_request",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const db = getDb();
    const { name, model, owner_hash, public_key } = parsed.data;

    // Check for duplicate public key
    const [existing] = await db.select().from(agents).where(eq(agents.publicKey, public_key));
    if (existing) {
      return res.status(409).json({
        error: "agent_already_registered",
        agent_id: existing.agentId,
        message: "An agent with this public key is already registered.",
      });
    }

    const agentId = randomUUID();
    const [agent] = await db.insert(agents).values({
      agentId,
      name,
      model: model ?? null,
      ownerHash: owner_hash ?? null,
      ownerGithub: null,
      publicKey: public_key,
    }).returning();

    res.status(201).json({
      success: true,
      agent_id: agent.agentId,
      name: agent.name,
      verified: agent.verified,
      message: "Agent registered. Verify ownership by linking your GitHub account.",
    });
  } catch (e: any) {
    console.error("Agent registration error:", e);
    res.status(500).json({ error: "internal_error", message: "Registration failed." });
  }
}
