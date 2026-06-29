/**
 * Unit tests for pure-function modules with no database dependency.
 */
import { describe, it, expect } from "vitest";
import { computeFee, feeFromSnapshot, MINIMUM_JOB_CENTS, STANDARD_FEE_BPS, FOUNDER_FEE_BPS, FOUNDER_FEE_FLOOR_CENTS } from "../api/_lib/fee.js";
import { canonicalize } from "../api/_lib/auth.js";

describe("Fee math", () => {
  it("computeFee: standard tier — 4% on $75 job (Standard band)", () => {
    expect(computeFee({ amountCents: 7500, feeBps: 400, feeFloorCents: 0 })).toBe(300);
  });

  it("computeFee: standard tier — 3% on $100 job (Pro band)", () => {
    expect(computeFee({ amountCents: 10000, feeBps: 300, feeFloorCents: 0 })).toBe(300);
  });

  it("computeFee: standard tier — 2% on $1000 job (Enterprise band)", () => {
    expect(computeFee({ amountCents: 100000, feeBps: 200, feeFloorCents: 0 })).toBe(2000);
  });

  it("computeFee: starter band — 5% on $10 job but floor applies", () => {
    // 5% of $10 = $0.50, floor is $0.60 → max(50, 60) = 60
    expect(computeFee({ amountCents: 1000, feeBps: 500, feeFloorCents: 60 })).toBe(60);
  });

  it("computeFee: starter band — 5% on $25 job exceeds floor", () => {
    // 5% of $25 = $1.25, floor is $0.60 → max(125, 60) = 125
    expect(computeFee({ amountCents: 2500, feeBps: 500, feeFloorCents: 60 })).toBe(125);
  });

  it("computeFee: micro band — 10% on $3 job but floor applies", () => {
    // 10% of $3 = $0.30, floor is $0.40 → max(30, 40) = 40
    expect(computeFee({ amountCents: 300, feeBps: 1000, feeFloorCents: 40 })).toBe(40);
  });

  it("computeFee: founder tier — 2.5% on $75 job", () => {
    expect(computeFee({ amountCents: 7500, feeBps: 250, feeFloorCents: 0 })).toBe(188);
  });

  it("computeFee: founder tier — 1% on $5000 job (Enterprise band)", () => {
    expect(computeFee({ amountCents: 500000, feeBps: 100, feeFloorCents: 0 })).toBe(5000);
  });

  it("feeFromSnapshot uses frozen percentage", () => {
    // 4% stored as "4.0000" percent → 400 bps → 300 on 7500
    expect(feeFromSnapshot(7500, "4.0000", 0)).toBe(300);
    // 2% stored as "2.0000" percent → 200 bps → 200 on 10000
    expect(feeFromSnapshot(10000, "2.0000", 0)).toBe(200);
  });

  it("feeFromSnapshot defaults to legacy standard rate when null", () => {
    // Legacy: 5% → 500 bps
    expect(feeFromSnapshot(10000, null, null)).toBe(500);
  });

  it("feeFromSnapshot applies floor from snapshot", () => {
    expect(feeFromSnapshot(1000, "5.0000", 60)).toBe(60);
  });

  it("rejects non-integer or negative amounts", () => {
    expect(() => computeFee({ amountCents: 10.5, feeBps: 500, feeFloorCents: 0 })).toThrow();
    expect(() => computeFee({ amountCents: -1, feeBps: 500, feeFloorCents: 0 })).toThrow();
  });

  it("zero amount gives zero fee (standard) or floor (with floor)", () => {
    expect(computeFee({ amountCents: 0, feeBps: 400, feeFloorCents: 0 })).toBe(0);
    expect(computeFee({ amountCents: 0, feeBps: 500, feeFloorCents: 60 })).toBe(60);
  });

  it("MINIMUM_JOB_CENTS is $5.00 (500 cents)", () => {
    expect(MINIMUM_JOB_CENTS).toBe(500);
  });

  it("legacy constants preserved for backward compatibility", () => {
    expect(STANDARD_FEE_BPS).toBe(500);
    expect(FOUNDER_FEE_BPS).toBe(150);
    expect(FOUNDER_FEE_FLOOR_CENTS).toBe(60);
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
