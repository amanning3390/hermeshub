/**
 * POST /api/v1/auth/logout — destroy the current session and clear the cookie.
 *
 * Idempotent: succeeds whether or not a valid session cookie is present.
 */
import { withHandler, sendOk } from "../../_lib/http.js";
import { destroySession, readSessionCookie, clearSessionCookie } from "../../_lib/auth.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const sid = readSessionCookie(req.headers.cookie);
    if (sid) await destroySession(sid);
    res.setHeader("Set-Cookie", clearSessionCookie());
    sendOk(res, { ok: true });
  },
});
