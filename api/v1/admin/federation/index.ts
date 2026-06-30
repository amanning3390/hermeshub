/**
 * GET /api/v1/admin/federation — list all federation referrals (admin only).
 * POST /api/v1/admin/federation — add a new federation referral (admin only).
 *
 * Auth: requires a valid session bound to an agent with an active subscription.
 */
import { getDb } from "../../../_lib/db.js";
import { federation_referrals, agents } from "../../../../shared/schema.js";
import { withHandler, sendOk, parseBody, ApiError } from "../../../_lib/http.js";
import { getSession, readSessionCookie } from "../../../_lib/auth.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

const addReferralSchema = z.object({
  identifier: z.string().min(7).max(512).regex(/^urn:air:/, "must be a urn:air identifier"),
  displayName: z.string().min(1).max(255),
  type: z.string().min(1).max(120),
  url: z.string().url().max(2048),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional().default(100),
});

/** Verify the request comes from a logged-in subscribed agent. */
async function requireAdminAuth(req: import("@vercel/node").VercelRequest): Promise<void> {
  const sid = readSessionCookie(req.headers.cookie);
  if (!sid) throw new ApiError("UNAUTHORIZED", "authentication required");

  const session = await getSession(sid);
  if (!session) throw new ApiError("UNAUTHORIZED", "session expired or invalid");

  const data = (session.data ?? {}) as Record<string, unknown>;
  const agentId = data.agentId as string | undefined;
  if (!agentId) throw new ApiError("FORBIDDEN", "session is not bound to a worker agent");

  const db = getDb();
  const agentRows = await db
    .select({ subscriptionStatus: agents.subscriptionStatus })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agentRows[0] || agentRows[0].subscriptionStatus !== "active") {
    throw new ApiError("FORBIDDEN", "only subscribed agents may manage federation referrals");
  }
}

export default withHandler({
  GET: async ({ req, res }) => {
    await requireAdminAuth(req);
    const db = getDb();
    const rows = await db
      .select()
      .from(federation_referrals)
      .orderBy(federation_referrals.sortOrder, federation_referrals.addedAt);
    sendOk(res, { referrals: rows });
  },

  POST: async ({ req, res }) => {
    await requireAdminAuth(req);
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
