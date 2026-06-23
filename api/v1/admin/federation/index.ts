/**
 * GET /api/v1/admin/federation — list all federation referrals (admin only).
 * POST /api/v1/admin/federation — add a new federation referral (admin only).
 *
 * Auth: requires a valid session belonging to a user whose agent holds a
 * Founder-500 spot (slot 1–500). This is enforced via the requireFounderSession()
 * helper which checks the session → agent → founder_spots chain.
 */
import { getDb } from "../../../_lib/db.js";
import { federation_referrals, founder_spots } from "../../../../shared/schema.js";
import { withHandler, sendOk, parseBody, ApiError } from "../../../_lib/http.js";
import { ardError } from "../../../_lib/ard.js";
import { getSession, readSessionCookie } from "../../../_lib/auth.js";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const addReferralSchema = z.object({
  identifier: z.string().min(7).max(512).regex(/^urn:air:/, "must be a urn:air identifier"),
  displayName: z.string().min(1).max(255),
  type: z.string().min(1).max(120),
  url: z.string().url().max(2048),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional().default(100),
});

/** Verify the request comes from a logged-in founder-spot holder. */
async function requireFounderAuth(req: VercelRequest): Promise<void> {
  const sid = readSessionCookie(req.headers.cookie);
  if (!sid) throw new ApiError("UNAUTHORIZED", "authentication required");

  const session = await getSession(sid);
  if (!session) throw new ApiError("UNAUTHORIZED", "session expired or invalid");

  const data = (session.data ?? {}) as Record<string, unknown>;
  const agentId = data.agentId as string | undefined;
  if (!agentId) throw new ApiError("FORBIDDEN", "session is not bound to a worker agent");

  const db = getDb();
  const spots = await db
    .select({ slotNumber: founder_spots.slotNumber })
    .from(founder_spots)
    .where(eq(founder_spots.agentId, agentId))
    .limit(1);

  if (!spots[0]) throw new ApiError("FORBIDDEN", "only Founder-500 members may manage federation referrals");
}

export default withHandler({
  GET: async ({ req, res }) => {
    await requireFounderAuth(req);
    const db = getDb();
    const rows = await db
      .select()
      .from(federation_referrals)
      .orderBy(federation_referrals.sortOrder, federation_referrals.addedAt);
    sendOk(res, { referrals: rows });
  },

  POST: async ({ req, res }) => {
    await requireFounderAuth(req);
    const input = await parseBody(req, addReferralSchema);
    const db = getDb();

    try {
      const inserted = await db
        .insert(federation_referrals)
        .values({
          identifier: input.identifier,
          displayName: input.displayName,
          type: input.type,
          url: input.url,
          description: input.description,
          sortOrder: input.sortOrder ?? 100,
        })
        .returning();
      sendOk(res, { referral: inserted[0] }, 201);
    } catch (err) {
      if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
        throw new ApiError("CONFLICT", "a referral with this identifier already exists");
      }
      throw err;
    }
  },
});
