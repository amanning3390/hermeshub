/**
 * POST /api/v1/auth/github — begin the GitHub OAuth flow.
 *
 * Returns the GitHub authorize URL with a CSRF `state` we persist in a session.
 * If `GITHUB_CLIENT_ID` is not configured, returns 503 with a stable code so the
 * frontend can hide the GitHub button (GitHub login is optional per the brief).
 */
import { randomBytes } from "node:crypto";
import { withHandler, sendOk, ApiError } from "../../_lib/http.js";
import { createSession, buildSessionCookie } from "../../_lib/auth.js";
import { absoluteUrl } from "../../_lib/url.js";

export default withHandler({
  POST: async ({ res }) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new ApiError("GITHUB_OAUTH_NOT_CONFIGURED", "GitHub OAuth is not configured");
    }

    const state = randomBytes(16).toString("hex");
    const { id, expires } = await createSession(`oauth-state:${state}`, {
      kind: "oauth_state",
      state,
    });

    const redirectUri = absoluteUrl("/api/v1/auth/callback");
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "read:user");
    authorizeUrl.searchParams.set("state", state);

    res.setHeader("Set-Cookie", buildSessionCookie(id, expires, "hh_oauth"));
    sendOk(res, { authorize_url: authorizeUrl.toString(), state });
  },
});
