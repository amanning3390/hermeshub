/**
 * DELETE /api/v1/admin/federation/[id] — remove a federation referral (admin only).
 *
 * Auth: same active-subscription requirement as the collection endpoint.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../../_lib/db.js";
import { federation_referrals, agents } from "../../../../shared/schema.js";
import { withHandler, sendOk, param, ApiError } from "../../../_lib/http.js";
import { getSession, readSessionCookie } from "../../../_lib/auth.js";
import type { VercelRequest } from "@vercel/node";

async function requireAdminAuth(req: VercelRequest): Promise<void> {
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
  DELETE: async ({ req, res }) => {
    await requireAdminAuth(req);

    const id = param(req, "id");
    if (!id) throw new ApiError("VALIDATION", "missing referral id");

    const db = getDb();
    const deleted = await db
      .delete(federation_referrals)
      .where(eq(federation_referrals.id, id))
      .returning({ id: federation_referrals.id });

    if (!deleted[0]) throw new ApiError("NOT_FOUND", `referral not found: ${id}`);

    sendOk(res, { deleted: true, id: deleted[0].id });
  },
});
