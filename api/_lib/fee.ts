/**
 * Platform fee resolution (plan §23.6, §23.11).
 *
 * Standard tier:    5.00% of job value.
 * Founder-500 tier: max(1.50% × job value, $0.60) — permanent, identity-bound.
 *
 * Fees are computed in integer cents and rounded to the nearest cent. The
 * resolved fee + floor are snapshotted onto the work_requests row at award time
 * so later fee changes never apply retroactively.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db.js";
import { founder_spots, agents } from "../../shared/schema.js";

export const STANDARD_FEE_BPS = 500; // 5.00%
export const FOUNDER_FEE_BPS = 150; // 1.50%
export const FOUNDER_FEE_FLOOR_CENTS = 60; // $0.60

export interface ResolvedFee {
  tier: "founder" | "standard";
  /** Effective rate in basis points used for the snapshot. */
  feeBps: number;
  /** Floor in cents (0 for standard tier). */
  feeFloorCents: number;
  /** Computed fee for this specific amount, in integer cents. */
  feeCents: number;
  /** Founder slot number when the founder tier applies. */
  slotNumber?: number;
}

/**
 * Pure fee math. `amountCents` is the job value in cents.
 *   founder: max(round(amountCents × bps / 10000), floor)
 *   standard: round(amountCents × bps / 10000)
 */
export function computeFee(params: {
  amountCents: number;
  feeBps: number;
  feeFloorCents: number;
}): number {
  if (!Number.isInteger(params.amountCents) || params.amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }
  const pct = Math.round((params.amountCents * params.feeBps) / 10000);
  return Math.max(pct, params.feeFloorCents);
}

/**
 * Resolve the fee for a worker agent at award time. Looks up an *active* founder
 * spot bound to the agent; falls back to the standard 5% otherwise.
 */
export async function resolveFee(
  workerAgentId: string,
  amountCents: number,
): Promise<ResolvedFee> {
  const db = getDb();

  const rows = await db
    .select({
      slotNumber: founder_spots.slotNumber,
      feeRateBps: founder_spots.feeRateBps,
      feeFloorCents: founder_spots.feeFloorCents,
    })
    .from(founder_spots)
    .where(and(eq(founder_spots.agentId, workerAgentId), eq(founder_spots.status, "active")))
    .limit(1);

  if (rows.length > 0) {
    const spot = rows[0];
    return {
      tier: "founder",
      feeBps: spot.feeRateBps,
      feeFloorCents: spot.feeFloorCents,
      feeCents: computeFee({
        amountCents,
        feeBps: spot.feeRateBps,
        feeFloorCents: spot.feeFloorCents,
      }),
      slotNumber: spot.slotNumber,
    };
  }

  return {
    tier: "standard",
    feeBps: STANDARD_FEE_BPS,
    feeFloorCents: 0,
    feeCents: computeFee({ amountCents, feeBps: STANDARD_FEE_BPS, feeFloorCents: 0 }),
  };
}

/** Recompute a fee from a snapshot already frozen on a work_requests row. */
export function feeFromSnapshot(
  amountCents: number,
  feePctSnapshot: string | number | null,
  feeFloorCentsSnapshot: number | null,
): number {
  const bps =
    feePctSnapshot == null
      ? STANDARD_FEE_BPS
      : Math.round(Number(feePctSnapshot) * 100); // numeric percent → bps
  return computeFee({
    amountCents,
    feeBps: bps,
    feeFloorCents: feeFloorCentsSnapshot ?? 0,
  });
}

/** Convenience guard used by award flows. */
export async function isActiveFounder(workerAgentId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: founder_spots.id })
    .from(founder_spots)
    .innerJoin(agents, eq(agents.id, founder_spots.agentId))
    .where(and(eq(founder_spots.agentId, workerAgentId), eq(founder_spots.status, "active")))
    .limit(1);
  return rows.length > 0;
}
