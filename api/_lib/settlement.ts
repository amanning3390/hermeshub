/**
 * Settlement preconditions shared by the MPP and Link payment rails.
 *
 * Before creating any charge we must have: an awarded work request, the winning
 * bid's price (the charge amount), the worker's payable connected account, and
 * the fee recomputed from the snapshot frozen at award time. This helper gathers
 * all of that and rejects with the right error if any piece is missing.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { bids, work_requests, type WorkRequest } from "../../shared/schema.js";
import { feeFromSnapshot } from "./fee.js";
import { getStripeAccountForAgent } from "./stripe-accounts.js";
import { ApiError } from "./http.js";

export interface SettlementContext {
  work: WorkRequest;
  workerAgentId: string;
  workerStripeAccountId: string;
  amountCents: number;
  feeCents: number;
  currency: string;
}

export async function loadSettlementContext(work: WorkRequest): Promise<SettlementContext> {
  if (work.status !== "awarded") {
    throw new ApiError("CONFLICT", `work must be awarded to pay (status: ${work.status})`);
  }
  if (!work.awardedBidId || !work.awardedAgentId) {
    throw new ApiError("UNPROCESSABLE", "work is awarded but missing bid/agent linkage");
  }

  const db = getDb();
  const bidRows = await db
    .select({ priceCents: bids.priceCents })
    .from(bids)
    .where(eq(bids.id, work.awardedBidId))
    .limit(1);
  const amountCents = bidRows[0]?.priceCents;
  if (amountCents == null) throw new ApiError("UNPROCESSABLE", "awarded bid not found");

  const acct = await getStripeAccountForAgent(work.awardedAgentId);
  if (!acct) throw new ApiError("WORKER_NOT_PAYABLE", "worker has no connected account");
  if (!(acct.chargesEnabled && acct.payoutsEnabled)) {
    throw new ApiError("WORKER_NOT_PAYABLE", "worker account is not fully enabled");
  }

  const feeCents = feeFromSnapshot(amountCents, work.feePctSnapshot, work.feeFloorCentsSnapshot);

  return {
    work,
    workerAgentId: work.awardedAgentId,
    workerStripeAccountId: acct.stripeAccountId,
    amountCents,
    feeCents,
    currency: work.currency,
  };
}
