/**
 * Embeddings via NVIDIA Nemotron (through OpenRouter free tier).
 *
 * Uses nvidia/llama-nemotron-embed-vl-1b-v2 for semantic search.
 * Falls back to keyword matching when no API key is available.
 */
import { log } from "./log.js";

const EMBED_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2:free";

/**
 * Generate an embedding vector for the given text.
 *
 * Uses NVIDIA Nemotron embeddings via OpenRouter.
 * Returns null if no API key is configured (search falls back to keyword matching).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      log({ level: "warn", msg: `Embeddings API error: ${response.status}`, detail: errText.slice(0, 200) });
      return null;
    }

    const data = await response.json() as { data?: Array<{ embedding?: number[] }> };
    const embedding = data.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      log({ level: "warn", msg: "Embeddings API returned no embedding data" });
      return null;
    }

    return embedding;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    log({ level: "warn", msg: `Embeddings request failed: ${msg}` });
    return null;
  }
}

/**
 * Compute cosine similarity between two vectors.
 * Returns 0 if either vector is null/empty or lengths don't match.
 */
export function cosineSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * Simple text matching score as a fallback when embeddings are unavailable.
 * Tokenizes both strings and computes Jaccard similarity.
 */
export function textSimilarity(query: string, target: string): number {
  const queryTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  const targetTokens = new Set(target.toLowerCase().split(/\s+/).filter(Boolean));

  if (queryTokens.size === 0 || targetTokens.size === 0) return 0;

  let intersection = 0;
  queryTokens.forEach((token) => {
    if (targetTokens.has(token)) intersection++;
  });

  const union = queryTokens.size + targetTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}
