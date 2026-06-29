/**
 * Work collection endpoints.
 *
 *   POST /api/v1/work — create a work request. If `capability_uris` is empty we
 *     run autosuggest and return suggestions instead of persisting, so the
 *     wizard can confirm capabilities first (HTTP 200 with `needsConfirmation`).
 *   GET  /api/v1/work — list/filter open work, paginated by offset cursor.
 */
import { randomBytes } from "node:crypto";
import { and, eq, or, ilike, sql, lt } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import { work_requests, requesters } from "../../../shared/schema.js";
import { withHandler, sendOk, param, intParam, parseBody } from "../../_lib/http.js";
import { createWorkSchema } from "../../_lib/validate.js";
import { upsertRequesterByDid } from "../../_lib/entities.js";
import { suggestCapabilities } from "../../_lib/suggest.js";
import { readSessionCookie, getSession } from "../../_lib/auth.js";

function newPublicId(): string {
  // 12 url-safe chars, base32-ish from random bytes.
  return randomBytes(8).toString("hex").slice(0, 12);
}

export default withHandler({
  POST: async ({ req, res }) => {
    const input = await parseBody(req, createWorkSchema);

    const capabilityUris = input.capabilityUris ?? [];
    if (capabilityUris.length === 0) {
      const suggestions = await suggestCapabilities(input.title, input.brief);
      sendOk(res, { needsConfirmation: true, suggestions });
      return;
    }

    // Derive the requester identity from the session when available so the
    // award endpoint can later verify ownership. Fall back to the client-
    // supplied requesterDid for CLI/agent callers without a browser session.
    let requesterDid = input.requesterDid;
    const sid = readSessionCookie(req.headers.cookie);
    const session = sid ? await getSession(sid) : null;
    if (session) {
      const sessionData = (session.data ?? {}) as Record<string, unknown>;
      const sessionUrnAir = sessionData.urnAir as string | undefined;
      const sessionGithubId = sessionData.githubId as string | undefined;
      if (sessionUrnAir) {
        requesterDid = sessionUrnAir;
      } else if (sessionGithubId) {
        // GitHub-authenticated user — look up their requester by githubId.
        const db0 = getDb();
        const ghRows = await db0
          .select({ name: requesters.name })
          .from(requesters)
          .where(eq(requesters.githubId, sessionGithubId))
          .limit(1);
        if (ghRows[0]?.name) requesterDid = ghRows[0].name;
      }
    }

    const requester = await upsertRequesterByDid(requesterDid);
    const db = getDb();

    const inserted = await db
      .insert(work_requests)
      .values({
        publicId: newPublicId(),
        requesterId: requester.id,
        title: input.title,
        brief: input.brief,
        capabilityUris,
        budgetCents: Math.round(input.budgetUsd * 100),
        currency: input.currency,
        pricingType: input.pricingType,
        ipLicense: input.ipLicense,
        visibility: input.visibility,
        deadline: input.deadline,
        status: "open",
      })
      .returning();

    sendOk(res, { work: inserted[0] }, 201);
  },

  GET: async ({ req, res }) => {
    const db = getDb();
    const capability = param(req, "capability");
    const domain = param(req, "domain");
    const status = param(req, "status") ?? "open";
    const q = param(req, "q");
    const limit = intParam(req, "limit", 20, 100);
    const cursor = param(req, "cursor"); // ISO timestamp of last seen createdAt

    const conditions = [eq(work_requests.visibility, "public")];
    if (status !== "all") conditions.push(eq(work_requests.status, status));
    if (capability) {
      conditions.push(sql`${work_requests.capabilityUris} @> ARRAY[${capability}]::text[]`);
    }
    if (domain) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM unnest(${work_requests.capabilityUris}) u WHERE u LIKE ${"hct:" + domain + ":%"})`,
      );
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(or(ilike(work_requests.title, like), ilike(work_requests.brief, like))!);
    }
    if (cursor) {
      const d = new Date(cursor);
      if (!Number.isNaN(d.getTime())) conditions.push(lt(work_requests.createdAt, d));
    }

    const rows = await db
      .select()
      .from(work_requests)
      .where(and(...conditions))
      .orderBy(sql`${work_requests.createdAt} DESC`)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]?.createdAt?.toISOString() : null;

    sendOk(res, { work: page, nextCursor, hasMore });
  },
});
