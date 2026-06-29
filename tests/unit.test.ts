/**
 * Unit tests for pure-function modules with no database dependency.
 */
import { describe, it, expect } from "vitest";
import { computeFee, feeFromSnapshot, STANDARD_FEE_BPS, FOUNDER_FEE_BPS, FOUNDER_FEE_FLOOR_CENTS } from "../api/_lib/fee.js";
import { canonicalize } from "../api/_lib/auth.js";

describe("Fee math", () => {
  it("standard tier: 5% of job value", () => {
    expect(computeFee({ amountCents: 10000, feeBps: STANDARD_FEE_BPS, feeFloorCents: 0 })).toBe(500);
    expect(computeFee({ amountCents: 5000, feeBps: STANDARD_FEE_BPS, feeFloorCents: 0 })).toBe(250);
  });

  it("founder tier: max(1.5%, floor) applies floor for small amounts", () => {
    // $5 job = 0.75% of 500 = 7.5 → rounds to 8, but floor is 60 → max(8, 60) = 60
    expect(computeFee({ amountCents: 500, feeBps: FOUNDER_FEE_BPS, feeFloorCents: FOUNDER_FEE_FLOOR_CENTS })).toBe(60);
  });

  it("founder tier: 1.5% above floor", () => {
    // $100 job = 1.5% of 10000 = 150 → above floor of 60 → 150
    expect(computeFee({ amountCents: 10000, feeBps: FOUNDER_FEE_BPS, feeFloorCents: FOUNDER_FEE_FLOOR_CENTS })).toBe(150);
  });

  it("feeFromSnapshot uses frozen percentage", () => {
    // 5% stored as "5.0000" percent → 500 bps → 500 on 10000
    expect(feeFromSnapshot(10000, "5.0000", 0)).toBe(500);
    // 1.5% stored as "1.5000" percent → 150 bps → 150 on 10000
    expect(feeFromSnapshot(10000, "1.5000", 0)).toBe(150);
  });

  it("feeFromSnapshot defaults to standard when null", () => {
    expect(feeFromSnapshot(10000, null, null)).toBe(500);
  });

  it("rejects non-integer or negative amounts", () => {
    expect(() => computeFee({ amountCents: 10.5, feeBps: 500, feeFloorCents: 0 })).toThrow();
    expect(() => computeFee({ amountCents: -1, feeBps: 500, feeFloorCents: 0 })).toThrow();
  });

  it("zero amount gives zero fee (standard) or floor (founder)", () => {
    expect(computeFee({ amountCents: 0, feeBps: STANDARD_FEE_BPS, feeFloorCents: 0 })).toBe(0);
    expect(computeFee({ amountCents: 0, feeBps: FOUNDER_FEE_BPS, feeFloorCents: FOUNDER_FEE_FLOOR_CENTS })).toBe(60);
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
