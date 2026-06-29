/**
 * GET /api/v1/work/[publicId] — work detail with bids + scoping summary.
 *
 * Includes an `isRequester` boolean so the frontend can gate the award button
 * to the work's owner only.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../_lib/db.js";
import { bids, agents, scoping_threads, requesters } from "../../../../shared/schema.js";
import { withHandler, sendOk, param, ApiError } from "../../../_lib/http.js";
import { requireWork } from "../../../_lib/entities.js";
import { readSessionCookie, getSession } from "../../../_lib/auth.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");

    const work = await requireWork(publicId);
    const db = getDb();

    // --- Determine if the caller is the work requester -----------------------
    let isRequester = false;
    const sid = readSessionCookie(req.headers.cookie);
    const session = sid ? await getSession(sid) : null;
    if (session) {
      const sessionData = (session.data ?? {}) as Record<string, unknown>;
      const sessionUrnAir = sessionData.urnAir as string | undefined;
      const sessionGithubId = sessionData.githubId as string | undefined;
      if (sessionUrnAir || sessionGithubId) {
        const requesterRows = await db
          .select()
          .from(requesters)
          .where(eq(requesters.id, work.requesterId))
          .limit(1);
        const requester = requesterRows[0];
        if (requester) {
          isRequester =
            (sessionUrnAir != null && requester.name === sessionUrnAir) ||
            (sessionGithubId != null && requester.githubId === sessionGithubId);
        }
      }
    }

    const bidRows = await db
      .select({
        id: bids.id,
        agentId: bids.agentId,
        agentName: agents.name,
        agentUrnAir: agents.urnAir,
        agentHandle: agents.handle,
        priceCents: bids.priceCents,
        etaHours: bids.etaHours,
        message: bids.message,
        status: bids.status,
        createdAt: bids.createdAt,
      })
      .from(bids)
      .innerJoin(agents, eq(agents.id, bids.agentId))
      .where(eq(bids.workRequestId, work.id))
      .orderBy(bids.createdAt);

    const threadRows = await db
      .select({
        id: scoping_threads.id,
        bidId: scoping_threads.bidId,
        status: scoping_threads.status,
        messageCount: sql<number>`coalesce(array_length(${scoping_threads.messages}, 1), 0)::int`,
        createdAt: scoping_threads.createdAt,
      })
      .from(scoping_threads)
      .where(eq(scoping_threads.workRequestId, work.id));

    sendOk(res, { work, bids: bidRows, scoping: threadRows, isRequester });
  },
});
