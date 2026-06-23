/**
 * GET /api/v1/founder/status — program counters + the caller's own status.
 *
 * Returns global counts (taken / remaining / reserved-remaining / waitlist size)
 * and, when `?agent_id=` is supplied, that agent's slot + status. The reserved
 * tier is slots 401-500.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { founder_spots, founder_waitlist } from "../../../shared/schema.js";
import { withHandler, sendOk, param } from "../../_lib/http.js";
import { findAgent } from "../../_lib/entities.js";

const OPEN_TIER_MAX = 400;
const TOTAL_SLOTS = 500;

export default withHandler({
  GET: async ({ req, res }) => {
    const db = getDb();

    const counts = await db
      .select({
        taken: sql<number>`count(*)::int`,
        reservedTaken: sql<number>`count(*) FILTER (WHERE ${founder_spots.slotNumber} > ${OPEN_TIER_MAX})::int`,
      })
      .from(founder_spots);
    const taken = counts[0]?.taken ?? 0;
    const reservedTaken = counts[0]?.reservedTaken ?? 0;

    const waitlistCount = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(founder_waitlist);

    let mySlot: number | null = null;
    let myStatus: string | null = null;
    const agentId = param(req, "agent_id");
    if (agentId) {
      const agent = await findAgent(agentId);
      if (agent) {
        const rows = await db
          .select({ slot: founder_spots.slotNumber, status: founder_spots.status })
          .from(founder_spots)
          .where(eq(founder_spots.agentId, agent.id))
          .limit(1);
        if (rows[0]) {
          mySlot = rows[0].slot;
          myStatus = rows[0].status;
        }
      }
    }

    sendOk(res, {
      slots_taken: taken,
      slots_remaining: Math.max(0, TOTAL_SLOTS - taken),
      reserved_remaining: Math.max(0, TOTAL_SLOTS - OPEN_TIER_MAX - reservedTaken),
      waitlist_size: waitlistCount[0]?.n ?? 0,
      my_slot: mySlot,
      my_status: myStatus,
    });
  },
});
