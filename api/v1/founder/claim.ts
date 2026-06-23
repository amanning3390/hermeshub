/**
 * POST /api/v1/founder/claim — atomic Founder-500 slot claim.
 *
 * Runs in a single transaction over a pooled TCP connection (the neon-http
 * driver can't hold row locks). We compute the lowest free slot from
 * `generate_series(1,500) EXCEPT taken`, locking the founder_spots rows with
 * `FOR UPDATE SKIP LOCKED` so concurrent claimants never grab the same slot and
 * never livelock. Slots 1-400 are open; 401-500 are reserved and only granted to
 * agents that declare a capability in an under-supplied domain. When full we add
 * the agent to the waitlist and return its position.
 *
 * v3 change: identity is bound to urn_air (not did_web).
 */
import { withTransaction } from "../../_lib/pg.js";
import { withHandler, sendOk, parseBody, ApiError } from "../../_lib/http.js";
import { founderClaimSchema } from "../../_lib/validate.js";
import { requireAgent } from "../../_lib/entities.js";

const OPEN_TIER_MAX = 400;
const TOTAL_SLOTS = 500;
// A domain is "under-supplied" if fewer than this many agents declare it.
const UNDERSUPPLIED_THRESHOLD = 3;

export default withHandler({
  POST: async ({ req, res }) => {
    const input = await parseBody(req, founderClaimSchema);
    const agent = await requireAgent(input.agentId);

    // Validate identity — accept urnAir or legacy didWeb (which now resolves to urn_air).
    const claimedIdentity = input.urnAir ?? input.didWeb;
    if (claimedIdentity && agent.urnAir !== claimedIdentity) {
      throw new ApiError("FORBIDDEN", "urn_air does not match the agent");
    }

    const result = await withTransaction(async (client) => {
      // Already holds a spot? Idempotent return.
      const mine = await client.query(
        "SELECT slot_number, status FROM founder_spots WHERE agent_id = $1",
        [agent.id],
      );
      if (mine.rows[0]) {
        return { kind: "existing" as const, slot: mine.rows[0] };
      }

      // Lowest free slot in the OPEN tier (1..400), locking taken rows.
      const openSlot = await client.query(
        `SELECT s AS slot_number
           FROM generate_series(1, $1) AS s
          WHERE s NOT IN (
                  SELECT slot_number FROM founder_spots FOR UPDATE SKIP LOCKED
                )
          ORDER BY s
          LIMIT 1`,
        [OPEN_TIER_MAX],
      );

      let slotNumber: number | null = openSlot.rows[0]?.slot_number ?? null;

      // Open tier exhausted → consider the reserved tier (401..500).
      if (slotNumber == null) {
        const eligible = await client.query(
          `SELECT 1
             FROM agent_capabilities ac
             JOIN capabilities c ON c.uri = ac.capability_uri
            WHERE ac.agent_id = $1
              AND c.is_qualifier = false
              AND c.domain IN (
                    SELECT c2.domain
                      FROM capabilities c2
                      LEFT JOIN agent_capabilities ac2 ON ac2.capability_uri = c2.uri
                     WHERE c2.is_qualifier = false
                     GROUP BY c2.domain
                    HAVING COUNT(DISTINCT ac2.agent_id) < $2
                  )
            LIMIT 1`,
          [agent.id, UNDERSUPPLIED_THRESHOLD],
        );
        if (eligible.rows[0]) {
          const reservedSlot = await client.query(
            `SELECT s AS slot_number
               FROM generate_series($1, $2) AS s
              WHERE s NOT IN (
                      SELECT slot_number FROM founder_spots FOR UPDATE SKIP LOCKED
                    )
              ORDER BY s
              LIMIT 1`,
            [OPEN_TIER_MAX + 1, TOTAL_SLOTS],
          );
          slotNumber = reservedSlot.rows[0]?.slot_number ?? null;
        }
      }

      if (slotNumber == null) {
        // Full (or not eligible for reserved) → waitlist.
        const existing = await client.query(
          "SELECT position FROM founder_waitlist WHERE urn_air = $1",
          [agent.urnAir],
        );
        if (existing.rows[0]) {
          return { kind: "waitlist" as const, position: existing.rows[0].position };
        }
        const next = await client.query(
          "SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM founder_waitlist",
        );
        const position = next.rows[0].pos as number;
        await client.query(
          "INSERT INTO founder_waitlist (urn_air, position) VALUES ($1, $2)",
          [agent.urnAir, position],
        );
        return { kind: "waitlist" as const, position };
      }

      const inserted = await client.query(
        `INSERT INTO founder_spots (agent_id, urn_air, slot_number, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING slot_number, fee_rate_bps, fee_floor_cents, status`,
        [agent.id, agent.urnAir, slotNumber],
      );
      return { kind: "claimed" as const, slot: inserted.rows[0] };
    });

    if (result.kind === "existing") {
      sendOk(res, { claimed: false, alreadyHeld: true, slot: result.slot });
    } else if (result.kind === "waitlist") {
      sendOk(res, { claimed: false, waitlisted: true, position: result.position }, 202);
    } else {
      sendOk(res, { claimed: true, slot: result.slot }, 201);
    }
  },
});
