/**
 * Capability autosuggest — lightweight keyword match (no LLM, plan §6 fallback).
 *
 * Tokenizes the work title + brief and scores each work-capability leaf by how
 * many of its name tokens and synonyms appear in the text. Returns the top
 * matches with a normalized confidence so the post-work wizard can pre-select
 * capability URIs for the requester to confirm.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { capabilities } from "../../shared/schema.js";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "my", "our",
  "need", "want", "looking", "help", "please", "some", "that", "this", "is", "are",
  "be", "can", "you", "i", "we", "it", "do", "make", "build", "create",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

export interface Suggestion {
  uri: string;
  confidence: number;
  leafName: string;
  domain: string;
}

/**
 * Score work-capability leaves against the query text. Returns up to `limit`
 * suggestions sorted by descending confidence (only positive scores).
 */
export async function suggestCapabilities(
  title: string,
  brief: string,
  limit = 8,
): Promise<Suggestion[]> {
  const tokens = tokenize(`${title} ${title} ${brief}`); // title weighted 2x
  if (tokens.size === 0) return [];

  const db = getDb();
  const rows = await db
    .select({
      uri: capabilities.uri,
      domain: capabilities.domain,
      leaf: capabilities.leaf,
      displayName: capabilities.displayName,
      synonyms: capabilities.synonyms,
    })
    .from(capabilities)
    .where(eq(capabilities.isQualifier, false));

  const scored = rows.map((r) => {
    const terms = new Set<string>([
      ...Array.from(tokenize(r.leaf)),
      ...Array.from(tokenize(r.displayName)),
      ...Array.from(tokenize(r.domain)),
      ...r.synonyms.flatMap((s) => Array.from(tokenize(s))),
    ]);
    let hits = 0;
    for (const t of Array.from(terms)) if (tokens.has(t)) hits++;
    // Domain name match is a weak signal; exact leaf/synonym hits dominate.
    const denom = Math.max(3, terms.size);
    const confidence = hits === 0 ? 0 : Math.min(1, hits / denom + hits * 0.1);
    return { uri: r.uri, confidence: Number(confidence.toFixed(3)), leafName: r.leaf, domain: r.domain, hits };
  });

  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.confidence - a.confidence || b.hits - a.hits)
    .slice(0, limit)
    .map(({ uri, confidence, leafName, domain }) => ({ uri, confidence, leafName, domain }));
}
