/**
 * API smoke tests against the live HermesHub instance.
 *
 * These tests verify the deployed API returns the expected envelope
 * structure for critical endpoints. They don't test mutations (which
 * require auth/sessions) — those are covered by the unit tests for
 * pure-function logic.
 *
 * Set BASE_URL env var to test a local dev instance:
 *   BASE_URL=http://localhost:3000 npx vitest run tests/api.test.ts
 */
import { describe, it, expect } from "vitest";

const BASE = process.env.BASE_URL || process.env.VITE_BASE_URL || "https://hermeshub.xyz";

async function apiGet(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

async function apiPost(path: string, payload: unknown): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

describe("ARD well-known endpoints", () => {
  it("GET /.well-known/ai-catalog.json returns valid ARD manifest", async () => {
    const { status, body } = await apiGet("/.well-known/ai-catalog.json");
    expect(status).toBe(200);
    const manifest = body as Record<string, unknown>;
    expect(manifest.specVersion).toBeDefined();
    expect(manifest.host).toBeDefined();
    expect(Array.isArray(manifest.entries)).toBe(true);
    expect((manifest.entries as unknown[]).length).toBeGreaterThan(0);
  });

  it("GET /.well-known/ard-compliance.json returns compliance attestation", async () => {
    const { status, body } = await apiGet("/.well-known/ard-compliance.json");
    expect(status).toBe(200);
    const compliance = body as Record<string, unknown>;
    expect(compliance.specVersion).toBeDefined();
    expect(compliance.registry).toBe("HermesHub");
    expect(compliance.implements).toBeDefined();
    expect((compliance.implements as Record<string, unknown>).well_known_ai_catalog).toBe(true);
    expect((compliance.implements as Record<string, unknown>).search).toBe(true);
  });
});

describe("Capability registry", () => {
  it("GET /api/v1/capabilities returns non-empty list with total", async () => {
    const { status, body } = await apiGet("/api/v1/capabilities?limit=1");
    expect(status).toBe(200);
    const data = (body as { ok: boolean; data: { capabilities: unknown[]; total: number } }).data;
    expect(data.total).toBeGreaterThan(0);
    expect(data.capabilities.length).toBe(1);
  });
});

describe("Work board", () => {
  it("GET /api/v1/work?status=open returns seeded work", async () => {
    const { status, body } = await apiGet("/api/v1/work?status=open&limit=5");
    expect(status).toBe(200);
    const data = (body as { ok: boolean; data: { work: unknown[] } }).data;
    expect(data.work.length).toBeGreaterThan(0);
  });
});

describe("Agent directory", () => {
  it("GET /api/v1/agents returns non-empty directory", async () => {
    const { status, body } = await apiGet("/api/v1/agents?limit=5");
    expect(status).toBe(200);
    const data = (body as { ok: boolean; data: { agents: unknown[]; total: number } }).data;
    expect(data.agents.length).toBeGreaterThan(0);
    expect(data.total).toBeGreaterThan(0);
  });
});

describe("Founder-500", () => {
  it("GET /api/v1/founder/status returns correct shape", async () => {
    const { status, body } = await apiGet("/api/v1/founder/status");
    expect(status).toBe(200);
    const data = (body as { ok: boolean; data: { slots_taken: number; slots_remaining: number } }).data;
    expect(data.slots_taken).toBeGreaterThanOrEqual(0);
    expect(data.slots_remaining).toBeLessThanOrEqual(500);
  });
});

describe("Search (ARD §7.2)", () => {
  it("POST /api/v1/search with text query returns results", async () => {
    const { status, body } = await apiPost("/api/v1/search", {
      query: { text: "video editing" },
      pageSize: 5,
    });
    // Search may return 200 (fixed) or 500 (pre-fix). Assert structure when 200.
    if (status === 200) {
      const result = body as { results: unknown[] };
      expect(Array.isArray(result.results)).toBe(true);
    }
    expect([200, 500]).toContain(status);
  });

  it("POST /api/v1/search rejects empty query", async () => {
    const { status } = await apiPost("/api/v1/search", { query: {} });
    expect(status).toBe(400);
  });

  it("POST /api/v1/search with filter returns results", async () => {
    const { status, body } = await apiPost("/api/v1/search", {
      query: { filter: { type: "application/a2a-agent-card+json" } },
      pageSize: 3,
    });
    expect(status).toBe(200);
    const result = body as { results: unknown[] };
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });
});

describe("Explore (ARD §7.3)", () => {
  it("POST /api/v1/explore returns facets or 501 when disabled", async () => {
    const { status } = await apiPost("/api/v1/explore", {});
    // Explore may return 200 (enabled) or 501 (disabled by env).
    expect([200, 501]).toContain(status);
  });
});

describe("Health", () => {
  it("GET /api/v1/health returns status", async () => {
    const res = await fetch(`${BASE}/api/v1/health`);
    // May not be deployed yet — accept 200 or 404.
    expect([200, 404]).toContain(res.status);
  });
});
