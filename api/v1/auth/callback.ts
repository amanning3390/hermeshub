/**
 * GET /api/v1/auth/callback — GitHub OAuth callback.
 *
 * Validates the CSRF `state` against the oauth-state cookie, exchanges the code
 * for an access token, fetches the GitHub profile, creates a session, and
 * redirects to the app. Returns 503 if OAuth isn't configured.
 */
import { withHandler, param, ApiError } from "../../_lib/http.js";
import {
  createSession,
  getSession,
  destroySession,
  buildSessionCookie,
  readSessionCookie,
} from "../../_lib/auth.js";
import { absoluteUrl } from "../../_lib/url.js";

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url?: string;
}

export default withHandler({
  GET: async ({ req, res }) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ApiError("GITHUB_OAUTH_NOT_CONFIGURED", "GitHub OAuth is not configured");
    }

    const code = param(req, "code");
    const state = param(req, "state");
    if (!code || !state) throw new ApiError("VALIDATION", "missing code or state");

    // CSRF: the state must match the one stored in the oauth-state session.
    const stateCookie = readSessionCookie(req.headers.cookie, "hh_oauth");
    const stateSession = stateCookie ? await getSession(stateCookie) : null;
    const stored = (stateSession?.data as { state?: string } | undefined)?.state;
    if (!stored || stored !== state) {
      throw new ApiError("UNAUTHORIZED", "invalid OAuth state");
    }
    if (stateCookie) await destroySession(stateCookie);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: absoluteUrl("/api/v1/auth/callback"),
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) throw new ApiError("UNAUTHORIZED", "failed to exchange code");

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "User-Agent": "HermesHub",
        Accept: "application/vnd.github+json",
      },
    });
    const ghUser = (await userRes.json()) as GitHubUser;
    if (!ghUser?.id) throw new ApiError("UNAUTHORIZED", "failed to fetch GitHub profile");

    const githubId = String(ghUser.id);
    const { id, expires } = await createSession(`github:${githubId}`, {
      kind: "github",
      githubId,
      login: ghUser.login,
      name: ghUser.name ?? ghUser.login,
      avatarUrl: ghUser.avatar_url,
    });

    res.setHeader("Set-Cookie", buildSessionCookie(id, expires));
    res.statusCode = 302;
    res.setHeader("Location", absoluteUrl("/#/dashboard"));
    res.end();
  },
});
