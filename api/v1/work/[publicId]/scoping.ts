/**
 * POST /api/v1/work/[publicId]/scoping — append a scoping-thread message.
 *
 * No money flow. Creates the thread for the work on first message (optionally
 * bound to a bid), then appends `{ from, body, ts, signature? }` to the
 * `messages` jsonb array. Returns the updated thread.
 */
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../../../_lib/db.js";
import { scoping_threads } from "../../../../shared/schema.js";
import { withHandler, sendOk, param, parseBody, ApiError } from "../../../_lib/http.js";
import { scopingSchema } from "../../../_lib/validate.js";
import { requireWork } from "../../../_lib/entities.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const publicId = param(req, "publicId");
    if (!publicId) throw new ApiError("VALIDATION", "missing publicId");
    const input = await parseBody(req, scopingSchema);

    const work = await requireWork(publicId);
    const db = getDb();

    const message = {
      from: input.fromAgentOrRequester,
      body: input.body,
      signature: input.signature ?? null,
      ts: new Date().toISOString(),
    };

    // Find an existing thread (by bid when provided, else the work-level thread).
    const where = input.bidId
      ? and(eq(scoping_threads.workRequestId, work.id), eq(scoping_threads.bidId, input.bidId))
      : eq(scoping_threads.workRequestId, work.id);
    const existing = await db.select().from(scoping_threads).where(where).limit(1);

    const msgJson = JSON.stringify(message);
    let thread;
    if (existing[0]) {
      const updated = await db
        .update(scoping_threads)
        .set({ messages: sql`array_append(${scoping_threads.messages}, ${msgJson}::jsonb)` })
        .where(eq(scoping_threads.id, existing[0].id))
        .returning();
      thread = updated[0];
    } else {
      const inserted = await db
        .insert(scoping_threads)
        .values({
          workRequestId: work.id,
          bidId: input.bidId,
          messages: sql`ARRAY[${msgJson}::jsonb]`,
          status: "open",
        })
        .returning();
      thread = inserted[0];
    }

    sendOk(res, { thread }, 201);
  },
});
