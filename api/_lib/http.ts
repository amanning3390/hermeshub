/**
 * HTTP plumbing shared by every `/api/v1` handler.
 *
 * Provides:
 *   - the structured error envelope (`{ ok, data }` / `{ ok, error }`) the brief
 *     mandates, with HTTP status mapped from an error category;
 *   - `ApiError` so handlers can `throw` a typed failure and have it serialized
 *     uniformly;
 *   - `withHandler`, a wrapper that applies CORS, catches thrown errors, logs
 *     each request with a generated `request_id`, and dispatches by method;
 *   - JSON and raw body readers (the webhook route needs the unparsed bytes for
 *     signature verification).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { z } from "zod";
import { randomUUID } from "node:crypto";
import { applyCors } from "./cors.js";
import { log } from "./log.js";

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "WORKER_NOT_PAYABLE"
  | "IDEMPOTENCY_MISMATCH"
  | "GITHUB_OAUTH_NOT_CONFIGURED"
  | "STRIPE_NOT_CONFIGURED";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  WORKER_NOT_PAYABLE: 409,
  IDEMPOTENCY_MISMATCH: 409,
  GITHUB_OAUTH_NOT_CONFIGURED: 503,
  STRIPE_NOT_CONFIGURED: 503,
};

/** A typed, throwable API failure carrying a stable code + optional details. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function sendOk(res: VercelResponse, data: unknown, status = 200): void {
  res.status(status).json({ ok: true, data });
}

export function sendError(res: VercelResponse, err: ApiError): void {
  const status = STATUS_BY_CODE[err.code] ?? 500;
  res.status(status).json({
    ok: false,
    error: { code: err.code, message: err.message, details: err.details },
  });
}

export interface RequestContext {
  requestId: string;
  req: VercelRequest;
  res: VercelResponse;
}

type Handler = (ctx: RequestContext) => Promise<void> | void;

/**
 * Wrap a per-method handler map with CORS, request logging, and uniform error
 * serialization. Returns 405 for unlisted methods; OPTIONS is answered by CORS.
 */
export function withHandler(handlers: Partial<Record<string, Handler>>) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);

    if (applyCors(req, res)) return; // OPTIONS preflight handled

    const method = (req.method ?? "GET").toUpperCase();
    const handler = handlers[method];

    const started = Date.now();
    try {
      if (!handler) {
        throw new ApiError("METHOD_NOT_ALLOWED", `${method} not allowed`);
      }
      await handler({ requestId, req, res });
    } catch (err) {
      if (err instanceof ApiError) {
        log({ level: "warn", requestId, path: req.url, code: err.code, msg: err.message });
        sendError(res, err);
      } else {
        const message = err instanceof Error ? err.message : "unexpected error";
        log({ level: "error", requestId, path: req.url, msg: message });
        sendError(res, new ApiError("INTERNAL", "internal server error"));
      }
    } finally {
      log({
        level: "info",
        requestId,
        path: req.url,
        method,
        ms: Date.now() - started,
        status: res.statusCode,
      });
    }
  };
}

/**
 * Parse the JSON request body. Vercel pre-parses JSON into `req.body` when the
 * content-type is `application/json`; fall back to reading the stream for other
 * cases. Throws `VALIDATION` on malformed JSON.
 */
export async function readJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined && req.body !== null && typeof req.body !== "string") {
    return req.body;
  }
  const raw = await readRawBody(req);
  if (!raw || raw.length === 0) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new ApiError("VALIDATION", "request body is not valid JSON");
  }
}

/**
 * Read the unparsed request body as a Buffer. Required by the Stripe webhook
 * route, whose signature is computed over the exact bytes. When Vercel has
 * already buffered the body we reuse it; otherwise we drain the stream.
 */
export async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const pre = (req as unknown as { body?: unknown }).body;
  if (Buffer.isBuffer(pre)) return pre;
  if (typeof pre === "string") return Buffer.from(pre, "utf8");

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Read + validate the JSON body against a Zod schema, throwing `VALIDATION`
 * with the flattened issue list on failure. Returns the parsed, typed data.
 */
export async function parseBody<T>(req: VercelRequest, schema: z.ZodType<T>): Promise<T> {
  const body = await readJsonBody(req);
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(
      "VALIDATION",
      "request body failed validation",
      result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }
  return result.data;
}

/** Read a single string route/query param (Vercel gives string | string[]). */
export function param(req: VercelRequest, name: string): string | undefined {
  const v = req.query[name];
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Parse a bounded positive integer query param with a default + max clamp. */
export function intParam(req: VercelRequest, name: string, def: number, max: number): number {
  const raw = param(req, name);
  if (raw == null) return def;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}
