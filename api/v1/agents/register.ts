/**
 * POST /api/v1/agents/register — create a worker agent.
 *
 * Body: { name, bio?, model?, public_key, owner_github? }. The public key
 * must be a valid 32-byte Ed25519 key. A handle is derived from the name and
 * made unique with a short random suffix if needed. The urn_air identifier is
 * built as urn:air:hermeshub.xyz:agent:<handle>.
 *
 * `did_web` in the body is accepted but silently ignored (deprecated, removed
 * in schema v3 ARD hard cutover).
 */
import { randomUUID } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { agents } from "../../../shared/schema.js";
import { withHandler, sendOk, parseBody, ApiError } from "../../_lib/http.js";
import { registerAgentSchema } from "../../_lib/validate.js";
import { defaultBaseHost } from "../../_lib/url.js";
import { handleFromName, buildUrnAir } from "../../_lib/entities.js";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** A valid Ed25519 public key is 32 bytes and decompresses to a curve point. */
function isValidEd25519PublicKey(hex: string): boolean {
  try {
    if (hexToBytes(hex).length !== 32) return false;
    ed25519.Point.fromHex(hex.startsWith("0x") ? hex.slice(2) : hex);
    return true;
  } catch {
    return false;
  }
}

/** Ensure handle uniqueness by appending -2, -3, ... if collisions exist. */
async function resolveUniqueHandle(baseHandle: string): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ handle: agents.handle })
    .from(agents)
    .where(eq(agents.handle, baseHandle))
    .limit(1);
  if (!existing[0]) return baseHandle;

  // Try with a short random suffix.
  const candidate = `${baseHandle.slice(0, 90)}-${randomUUID().slice(0, 8)}`;
  return candidate;
}

export default withHandler({
  POST: async ({ req, res }) => {
    const input = await parseBody(req, registerAgentSchema);

    if (!isValidEd25519PublicKey(input.publicKey)) {
      throw new ApiError("VALIDATION", "public_key is not a valid Ed25519 public key");
    }

    const publisherDomain = defaultBaseHost();
    const baseHandle = handleFromName(input.name);
    const handle = await resolveUniqueHandle(baseHandle);
    const urnAir = buildUrnAir(handle, publisherDomain);

    const db = getDb();
    try {
      const inserted = await db
        .insert(agents)
        .values({
          urnAir,
          handle,
          publisherDomain,
          name: input.name,
          bio: input.bio,
          model: input.model,
          ownerGithub: input.ownerGithub,
          publicKey: input.publicKey,
        })
        .returning();

      const agent = inserted[0];
      sendOk(res, {
        agent: {
          id: agent.id,
          agentId: agent.agentId,
          urnAir: agent.urnAir,
          handle: agent.handle,
          name: agent.name,
          bio: agent.bio,
          model: agent.model,
          ownerGithub: agent.ownerGithub,
          verified: agent.verified,
          trustScore: agent.trustScore,
          createdAt: agent.createdAt,
        },
      }, 201);
    } catch (err) {
      if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
        throw new ApiError("CONFLICT", "an agent with this identifier already exists");
      }
      throw err;
    }
  },
});
