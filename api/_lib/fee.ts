/**
 * Platform fee resolution with volume-tiered pricing.
 *
 * The fee structure rewards scale: small jobs (where Stripe's flat costs
 * dominate) pay a higher percentage, while large jobs pay progressively less.
 * This mirrors payment industry norms and keeps HermesHub competitive on
 * high-value work.
 *
 * Two tiers:
 *   Standard:    2–10% depending on job value (target ≥50% net retention)
 *   Founder-500: 1–5% depending on job value (target ≥10% net retention)
 *
 * Fees are computed in integer cents and snapshotted onto work_requests at
 * award time so later fee changes never apply retroactively (plan §9.1, §23.11).
 *
 * Minimum job size: $5.00 (500 cents) for fiat rails. Sub-$5 micropayments
 * are only viable on MPP/x402 crypto rails (no Stripe $0.30 flat processing).
 * The minimum will be lifted when those rails are production-ready.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db.js";
import { founder_spots, agents } from "../../shared/schema.js";

/** Minimum job value in cents (fiat rails). Lifted when MPP/x402 is live. */
export const MINIMUM_JOB_CENTS = 500; // $5.00

/* -------------------------------------------------------------------------- */
/* Tier band definitions                                                       */
/* -------------------------------------------------------------------------- */

interface FeeBand {
  /** Upper bound in cents (exclusive). Infinity for the last band. */
  ceiling: number;
  /** Fee percentage in basis points. */
  bps: number;
  /** Minimum fee in cents (floor). */
  floorCents: number;
  /** Band name for display. */
  name: string;
}

/**
 * Standard tier — volume-tiered, target ≥50% net retention after Stripe costs.
 *   $0.01–$4.99:   10% (min $0.40) — micro / MPP territory
 *   $5–$24.99:      5% (min $0.60) — small tasks
 *   $25–$99.99:     4%             — typical freelance
 *   $100–$299.99:   3%             — projects
 *   $300–$999.99: 2.5%             — large engagements
 *   $1,000+:        2%             — enterprise
 */
const STANDARD_BANDS: FeeBand[] = [
  { ceiling: 500, bps: 1000, floorCents: 40, name: "Micro" },
  { ceiling: 2500, bps: 500, floorCents: 60, name: "Starter" },
  { ceiling: 10000, bps: 400, floorCents: 0, name: "Standard" },
  { ceiling: 30000, bps: 300, floorCents: 0, name: "Pro" },
  { ceiling: 100000, bps: 250, floorCents: 0, name: "Business" },
  { ceiling: Infinity, bps: 200, floorCents: 0, name: "Enterprise" },
];

/**
 * Founder-500 tier — volume-tiered, target ≥10% net retention.
 * Bounded subsidy for the first 500 workers, identity-bound, permanent.
 *   $0.01–$4.99:  5% (min $0.40)
 *   $5–$24.99:    3% (min $0.60)
 *   $25–$99.99: 2.5%
 *   $100–$299:   2%
 *   $300–$999: 1.5%
 *   $1,000+:     1%
 */
const FOUNDER_BANDS: FeeBand[] = [
  { ceiling: 500, bps: 500, floorCents: 40, name: "Micro" },
  { ceiling: 2500, bps: 300, floorCents: 60, name: "Starter" },
  { ceiling: 10000, bps: 250, floorCents: 0, name: "Standard" },
  { ceiling: 30000, bps: 200, floorCents: 0, name: "Pro" },
  { ceiling: 100000, bps: 150, floorCents: 0, name: "Business" },
  { ceiling: Infinity, bps: 100, floorCents: 0, name: "Enterprise" },
];

/** Resolve the fee band for a given amount in cents. */
function resolveBand(amountCents: number, bands: FeeBand[]): FeeBand {
  for (const band of bands) {
    if (amountCents < band.ceiling) return band;
  }
  return bands[bands.length - 1];
}

/** Legacy constants kept for backward compatibility with existing snapshots. */
export const STANDARD_FEE_BPS = 500; // 5.00% (legacy flat rate)
export const FOUNDER_FEE_BPS = 150; // 1.50% (legacy flat rate)
export const FOUNDER_FEE_FLOOR_CENTS = 60; // $0.60 (legacy flat floor)

export interface ResolvedFee {
  tier: "founder" | "standard";
  /** Band name within the tier (e.g. "Pro", "Enterprise"). */
  band: string;
  /** Effective rate in basis points for this specific amount. */
  feeBps: number;
  /** Floor in cents applied at this band. */
  feeFloorCents: number;
  /** Computed fee for this specific amount, in integer cents. */
  feeCents: number;
  /** Founder slot number when the founder tier applies. */
  slotNumber?: number;
}

/**
 * Pure fee math. `amountCents` is the job value in cents.
 *   fee = max(round(amountCents × bps / 10000), floor)
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
 * spot bound to the agent; falls back to the standard tier otherwise.
 */
export async function resolveFee(
  workerAgentId: string,
  amountCents: number,
): Promise<ResolvedFee> {
  const db = getDb();

  const rows = await db
    .select({
      slotNumber: founder_spots.slotNumber,
    })
    .from(founder_spots)
    .where(and(eq(founder_spots.agentId, workerAgentId), eq(founder_spots.status, "active")))
    .limit(1);

  const bands = rows.length > 0 ? FOUNDER_BANDS : STANDARD_BANDS;
  const tier: "founder" | "standard" = rows.length > 0 ? "founder" : "standard";
  const band = resolveBand(amountCents, bands);

  return {
    tier,
    band: band.name,
    feeBps: band.bps,
    feeFloorCents: band.floorCents,
    feeCents: computeFee({ amountCents, feeBps: band.bps, feeFloorCents: band.floorCents }),
    slotNumber: rows[0]?.slotNumber,
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
