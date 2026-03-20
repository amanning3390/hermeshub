import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GitHub Client ID not configured" });
  }

  // Generate a cryptographically random state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  // Set state as a cookie (HttpOnly, SameSite=Lax, short-lived)
  res.setHeader(
    "Set-Cookie",
    `oauth_state=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/; Secure`
  );

  const redirectUri = "https://hermeshub.xyz/api/v1/auth/github/callback";
  const scope = "read:user,user:email";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return res.redirect(302, githubAuthUrl);
}
