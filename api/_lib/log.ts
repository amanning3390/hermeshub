/**
 * Structured JSON logging to stdout (Vercel captures stdout per invocation).
 *
 * One line of JSON per event so logs are queryable. Never pass secrets, full
 * request bodies, or Stripe webhook payloads here (brief security rule). Fields
 * are free-form; `request_id`, `path`, and `agent_id` are conventional.
 */
type Level = "info" | "warn" | "error";

export interface LogFields {
  level: Level;
  msg?: string;
  requestId?: string;
  path?: string | undefined;
  method?: string;
  agentId?: string;
  code?: string;
  status?: number;
  ms?: number;
  [k: string]: unknown;
}

export function log(fields: LogFields): void {
  const { level, requestId, ...rest } = fields;
  const line = JSON.stringify({
    level,
    ts: new Date().toISOString(),
    request_id: requestId,
    ...rest,
  });
  // Route to the matching stream; stdout/stderr is the Vercel log sink.
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}
