/**
 * CORS policy for the API (brief security rule).
 *
 * The browser frontend is served from the same origin as the API in production
 * (`BASE_URL`), so same-origin requests need no special handling. We additionally
 * allow the configured `BASE_URL` origin explicitly (covers preview deployments
 * and local dev when set) and reflect it on the response. Credentials (the
 * session cookie) are allowed only for that trusted origin — never `*`.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, Idempotency-Key, X-Signature";

function allowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.BASE_URL) origins.push(process.env.BASE_URL.replace(/\/$/, ""));
  // Local dev convenience; harmless in prod where the browser won't send it.
  origins.push("http://localhost:5173");
  return origins;
}

/**
 * Apply CORS headers. Returns true if the request was an OPTIONS preflight that
 * has been fully answered (the caller should stop processing).
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Max-Age", "86400");

  if ((req.method ?? "").toUpperCase() === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
