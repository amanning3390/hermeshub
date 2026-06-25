/**
 * BASE_URL helpers.
 *
 * Every public identifier (did:web, ARD urns, Stripe redirect URLs) is derived
 * from the deployment's canonical origin. `BASE_URL` (e.g. https://hermeshub.xyz)
 * is the single source of truth; we fall back to the brief's production host so
 * code paths don't crash in environments where it isn't set yet.
 */
const FALLBACK_BASE = "https://hermeshub.xyz";

export function baseUrl(): string {
  return (process.env.BASE_URL ?? FALLBACK_BASE).replace(/\/$/, "");
}

/** Host portion only (no scheme), used for did:web and urn identifiers. */
export function defaultBaseHost(): string {
  try {
    return new URL(baseUrl()).host;
  } catch {
    return "hermeshub.xyz";
  }
}

/** Build an absolute URL under BASE_URL, joining a path safely. */
export function absoluteUrl(path: string): string {
  return `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}
