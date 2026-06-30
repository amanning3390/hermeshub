/**
 * Unit tests for pure-function modules with no database dependency.
 */
import { describe, it, expect } from "vitest";
import { cosineSimilarity, textSimilarity } from "../api/_lib/embeddings.js";
import { canonicalize } from "../api/_lib/auth.js";

describe("Cosine similarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns 0 for null or empty vectors", () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it("returns 0 for zero vectors (avoiding NaN)", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe("Text similarity (Jaccard)", () => {
  it("returns 1 for identical text", () => {
    expect(textSimilarity("hello world", "hello world")).toBe(1);
  });

  it("returns 0 for completely different text", () => {
    expect(textSimilarity("apple banana", "cherry date")).toBe(0);
  });

  it("returns partial match for overlapping words", () => {
    // intersection: {hello}, union: {hello, world, there}
    // 1/3 ≈ 0.333
    expect(textSimilarity("hello world", "hello there")).toBeCloseTo(1 / 3, 2);
  });

  it("is case-insensitive", () => {
    expect(textSimilarity("Hello World", "hello world")).toBe(1);
  });

  it("returns 0 for empty strings", () => {
    expect(textSimilarity("", "hello")).toBe(0);
    expect(textSimilarity("hello", "")).toBe(0);
  });
});

describe("Canonical JSON", () => {
  it("sorts keys alphabetically", () => {
    const result = canonicalize({ b: 1, a: 2, c: 3 });
    expect(result).toBe('{"a":2,"b":1,"c":3}');
  });

  it("handles nested objects recursively", () => {
    const result = canonicalize({ outer: { z: 1, a: 2 } });
    expect(result).toBe('{"outer":{"a":2,"z":1}}');
  });

  it("sorts arrays of objects by their keys, preserving array order", () => {
    const result = canonicalize({ arr: [{ b: 1, a: 2 }, { d: 3, c: 4 }] });
    expect(JSON.parse(result)).toEqual({ arr: [{ a: 2, b: 1 }, { c: 4, d: 3 }] });
  });

  it("produces identical output for semantically identical objects with different key order", () => {
    const a = canonicalize({ work_id: "abc", agent_id: "def", price: 100 });
    const b = canonicalize({ price: 100, agent_id: "def", work_id: "abc" });
    expect(a).toBe(b);
  });

  it("handles primitives correctly", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize("hello")).toBe('"hello"');
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize(true)).toBe("true");
  });
});
