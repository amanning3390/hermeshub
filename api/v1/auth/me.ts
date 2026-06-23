/**
 * GET /api/v1/auth/me — return the current session's user, or null.
 */
import { withHandler, sendOk } from "../../_lib/http.js";
import { getSession, readSessionCookie } from "../../_lib/auth.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const sid = readSessionCookie(req.headers.cookie);
    const session = sid ? await getSession(sid) : null;
    if (!session) {
      sendOk(res, { user: null });
      return;
    }
    const data = (session.data ?? {}) as Record<string, unknown>;
    sendOk(res, {
      user: {
        kind: data.kind ?? "unknown",
        urnAir: data.urnAir ?? null,
        agentId: data.agentId ?? null,
        githubId: data.githubId ?? null,
        login: data.login ?? null,
        name: data.name ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
      expires: session.expires,
    });
  },
});
