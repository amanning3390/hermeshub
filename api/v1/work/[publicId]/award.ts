/**
 * POST /api/v1/work/[publicId]/award — requester awards a bid.
 *
 * Mandatory pre-award gate (brief requirement #3): the winning worker's Stripe
 * connected account must have BOTH `charges_enabled` and `payouts_enabled`. If
 * not, reject 409 `WORKER_NOT_PAYABLE` with the outstanding requirements and an
 * onboarding link so the worker can finish.
 *
 * On success we snapshot the fee (resolver → frozen `fee_pct_snapshot` +
 * `fee_floor_cents_snapshot`) onto the work row so later fee changes never apply
 * retroactively, flip status to `awarded`, and record the winning bid.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../../../_lib/db.js";
import { bids, work_requests, requesters } from "../../../../shared/schema.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../_lib/http.js";
import { awardSchema } from "../../../_lib/validate.js";
import { requireWork } from "../../../_lib/entities.js";
import { resolveFee } from "../../../_lib/fee.js";
import { readSessionCookie, getSession } from "../../../_lib/auth.js";
import {
  getStripeAccountForAgent,
  syncStripeAccountFlags,
  requirementsDue,
} from "../../../_lib/stripe-accounts.js";
import { retrieveAccount, createAccountLink } from "../../../_lib/stripe.js";
import { absoluteUrl } from "../../../_lib/url.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");
    const input = await parseBody(req, awardSchema);

    const work = await requireWork(publicId);
    if (work.status !== "open" && work.status !== "scoping") {
      throw new ApiError("CONFLICT", `work already ${work.status}`);
    }

    // --- Authorization: verify the caller owns this work ---------------------
    const sid = readSessionCookie(req.headers.cookie);
    const session = sid ? await getSession(sid) : null;
    if (!session) {
      throw new ApiError("UNAUTHORIZED", "sign in to award a bid");
    }
    const sessionData = (session.data ?? {}) as Record<string, unknown>;
    const sessionUrnAir = sessionData.urnAir as string | undefined;
    if (!sessionUrnAir) {
      throw new ApiError("UNAUTHORIZED", "session has no identity");
    }

    // Look up the requester for this work and compare against the session identity.
    const db = getDb();
    const requesterRows = await db
      .select()
      .from(requesters)
      .where(eq(requesters.id, work.requesterId))
      .limit(1);
    const requester = requesterRows[0];
    if (!requester) {
      throw new ApiError("NOT_FOUND", "requester not found for this work");
    }

    // For anonymous sessions, the requester's name column stores the urn:air
    // identifier used at work-creation time (via upsertRequesterByDid).
    // For GitHub sessions, the requester is matched by githubId.
    const requesterIdentity = requester.name ?? "";
    const sessionGithubId = sessionData.githubId as string | undefined;
    const isOwner =
      requesterIdentity === sessionUrnAir ||
      (sessionGithubId && requester.githubId === sessionGithubId);
    if (!isOwner) {
      throw new ApiError("FORBIDDEN", "only the work requester can award bids");
    }
    const bidRows = await db
      .select()
      .from(bids)
      .where(and(eq(bids.id, input.bidId), eq(bids.workRequestId, work.id)))
      .limit(1);
    const bid = bidRows[0];
    if (!bid) throw new ApiError("NOT_FOUND", "bid not found for this work");

    // --- Mandatory payability gate -----------------------------------------
    const acct = await getStripeAccountForAgent(bid.agentId);
    if (!acct) {
      throw new ApiError("WORKER_NOT_PAYABLE", "worker has not connected a Stripe account", {
        requirements_due: ["stripe.onboarding"],
        onboarding_url: null,
      });
    }
    // Re-pull live state so a stale DB flag can't let an unpayable worker through.
    const liveAccount = await retrieveAccount(acct.stripeAccountId);
    await syncStripeAccountFlags(liveAccount);
    const payable = (liveAccount.charges_enabled ?? false) && (liveAccount.payouts_enabled ?? false);
    if (!payable) {
      const link = await createAccountLink(
        acct.stripeAccountId,
        absoluteUrl(`/api/v1/agents/${bid.agentId}/stripe/onboard`),
        absoluteUrl(`/#/agents/${bid.agentId}?onboarded=1`),
      );
      throw new ApiError("WORKER_NOT_PAYABLE", "worker cannot accept charges/payouts yet", {
        requirements_due: requirementsDue(liveAccount),
        onboarding_url: link.url,
      });
    }

    // --- Fee snapshot --------------------------------------------------------
    const fee = await resolveFee(bid.agentId, bid.priceCents);
    const feePctSnapshot = (fee.feeBps / 100).toFixed(4); // bps → percent string

    const updated = await db
      .update(work_requests)
      .set({
        status: "awarded",
        awardedBidId: bid.id,
        awardedAgentId: bid.agentId,
        feePctSnapshot,
        feeFloorCentsSnapshot: fee.feeFloorCents,
        awardedAt: new Date(),
      })
      .where(and(eq(work_requests.id, work.id), eq(work_requests.status, work.status)))
      .returning();

    if (!updated[0]) {
      // Another request awarded concurrently between our read and write.
      throw new ApiError("CONFLICT", "work was awarded concurrently");
    }

    await db.update(bids).set({ status: "awarded" }).where(eq(bids.id, bid.id));
    await db
      .update(bids)
      .set({ status: "rejected" })
      .where(and(eq(bids.workRequestId, work.id), eq(bids.status, "pending")));

    sendOk(res, {
      work: updated[0],
      fee: {
        tier: fee.tier,
        band: fee.band,
        fee_bps: fee.feeBps,
        fee_floor_cents: fee.feeFloorCents,
        fee_cents: fee.feeCents,
      },
    });
  },
});
