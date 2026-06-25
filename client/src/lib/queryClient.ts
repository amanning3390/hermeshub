import { QueryClient, type QueryFunction } from "@tanstack/react-query";

/**
 * API client for the HermesHub v1 endpoints. Every endpoint returns the
 * envelope `{ ok: true, data }` or `{ ok: false, error: { code, message,
 * details } }`. `apiRequest`/`getQueryFn` unwrap the envelope and surface a
 * typed `ApiError` so callers always work with `data` directly.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(status: number, error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: ApiErrorShape };

async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }
  if (body && body.ok === false) {
    throw new ApiError(res.status, body.error);
  }
  if (!res.ok || !body || body.ok !== true) {
    throw new ApiError(res.status, {
      code: "HTTP_ERROR",
      message: `Request failed with status ${res.status}`,
    });
  }
  return body.data;
}

/** Perform a mutation against the API and return the unwrapped `data`. */
export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data !== undefined ? { "Content-Type": "application/json" } : {},
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  return parseEnvelope<T>(res);
}

/**
 * Default query function. The query key's first element is the URL; any
 * additional object element is serialized into query-string params.
 */
export const getQueryFn: <T>() => QueryFunction<T> =
  () =>
  async ({ queryKey }) => {
    const [url, params] = queryKey as [string, Record<string, unknown>?];
    let fullUrl = url;
    if (params && typeof params === "object") {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
      }
      const qs = search.toString();
      if (qs) fullUrl += `?${qs}`;
    }
    const res = await fetch(fullUrl, { credentials: "include" });
    return parseEnvelope(res);
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
