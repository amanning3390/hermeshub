/**
 * Zod validation schemas for every mutating API surface (brief constraint #1).
 *
 * Handlers parse untrusted input through these before touching the database, so
 * the boundary is the only place validation happens — internal callers trust the
 * parsed types.
 */
import { z } from "zod";

const hex = z.string().regex(/^(0x)?[0-9a-fA-F]+$/, "must be hex");
const capabilityUri = z
  .string()
  .min(3)
  .max(160)
  .regex(/^hctq?:[a-z0-9:-]+$/, "must be an hct capability URI");
const urnAir = z.string().min(7).max(512).regex(/^urn:air:/, "must be a urn:air URN");
/** @deprecated use urnAir */
const didWeb = z.string().min(7).max(512).regex(/^did:web:|^urn:air:/, "must be a did:web or urn:air URN");

/**
 * Agent registration (Phase 2 body shape). A 32-byte Ed25519 public key is 64
 * hex chars; `did_web` is optional and derived server-side when omitted.
 */
export const registerAgentSchema = z.object({
  name: z.string().min(1).max(255),
  bio: z.string().max(2000).optional(),
  model: z.string().max(120).optional(),
  publicKey: hex.min(64).max(128),
  ownerGithub: z.string().max(120).optional(),
  /** Agent service endpoint URL (where clients contact/invoke the agent) */
  endpointUrl: z.string().url().max(2048).optional(),
  /** Deprecated — ignored if provided; handle is derived from name. */
  didWeb: z.string().optional(),
});
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

/** Declare a capability claim — Ed25519-signed by the agent. */
export const declareCapabilitySchema = z.object({
  capabilityUri,
  slaP95Ms: z.number().int().positive().max(86_400_000).optional(),
  priceMinUsd: z.number().nonnegative().max(1_000_000).optional(),
  priceMaxUsd: z.number().nonnegative().max(1_000_000).optional(),
  sandboxUrl: z.string().url().max(2048).optional(),
  nonce: z.string().min(1).max(128),
  ts: z.number().int().positive(),
  signature: hex.max(256),
});
export type DeclareCapabilityInput = z.infer<typeof declareCapabilitySchema>;

export const autosuggestSchema = z.object({
  title: z.string().min(1).max(255),
  brief: z.string().max(20000).default(""),
});
export type AutosuggestInput = z.infer<typeof autosuggestSchema>;

export const stripeOnboardSchema = z.object({
  email: z.string().email().max(320).optional(),
});
export type StripeOnboardInput = z.infer<typeof stripeOnboardSchema>;

/** Parse helper returning a typed result or a flat error list. */
export function safeParse<T>(schema: z.ZodType<T>, input: unknown):
  | { ok: true; data: T }
  | { ok: false; errors: string[] } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}
