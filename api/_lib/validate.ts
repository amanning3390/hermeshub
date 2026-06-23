/**
 * Zod validation schemas for every mutating API surface (brief constraint #1).
 *
 * Handlers parse untrusted input through these before touching the database, so
 * the boundary is the only place validation happens — internal callers trust the
 * parsed types. Money is accepted as integer cents; URIs and ids are length- and
 * charset-bounded to limit abuse.
 */
import { z } from "zod";
import { WORK_STATUSES, PRICING_TYPES } from "../../shared/schema.js";

const hex = z.string().regex(/^(0x)?[0-9a-fA-F]+$/, "must be hex");
const capabilityUri = z
  .string()
  .min(3)
  .max(160)
  .regex(/^hctq?:[a-z0-9:-]+$/, "must be an hct capability URI");
const urnAir = z.string().min(7).max(512).regex(/^urn:air:/, "must be a urn:air URN");
/** @deprecated use urnAir */
const didWeb = z.string().min(7).max(512).regex(/^did:web:|^urn:air:/, "must be a did:web or urn:air URN");
const usd = z.number().nonnegative().max(1_000_000); // dollars, ≤ $1M

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
  /** Deprecated — ignored if provided; handle is derived from name. */
  didWeb: z.string().optional(),
});
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

/** Declare a capability claim — Ed25519-signed by the agent. */
export const declareCapabilitySchema = z.object({
  capabilityUri,
  slaP95Ms: z.number().int().positive().max(86_400_000).optional(),
  priceMinUsd: usd.optional(),
  priceMaxUsd: usd.optional(),
  sandboxUrl: z.string().url().max(2048).optional(),
  nonce: z.string().min(1).max(128),
  ts: z.number().int().positive(),
  signature: hex.max(256),
});
export type DeclareCapabilityInput = z.infer<typeof declareCapabilitySchema>;

export const createWorkSchema = z.object({
  requesterDid: didWeb,
  title: z.string().min(3).max(255),
  brief: z.string().min(10).max(20000),
  capabilityUris: z.array(capabilityUri).max(20).default([]),
  budgetUsd: usd,
  currency: z.string().length(3).toLowerCase().default("usd"),
  pricingType: z.enum(PRICING_TYPES).default("fixed"),
  ipLicense: z.string().max(40).default("work-for-hire"),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  prefersRail: z.enum(["mpp", "link"]).optional(),
  deadline: z.coerce.date().optional(),
});
export type CreateWorkInput = z.infer<typeof createWorkSchema>;

export const autosuggestSchema = z.object({
  title: z.string().min(1).max(255),
  brief: z.string().max(20000).default(""),
});
export type AutosuggestInput = z.infer<typeof autosuggestSchema>;

export const submitBidSchema = z.object({
  agentId: z.string().uuid(),
  priceUsd: usd,
  etaHours: z.number().int().positive().max(8760).optional(),
  message: z.string().max(5000).optional(),
  nonce: z.string().min(1).max(128),
  ts: z.number().int().positive(),
  signature: hex.max(256),
});
export type SubmitBidInput = z.infer<typeof submitBidSchema>;

export const awardSchema = z.object({
  bidId: z.string().uuid(),
});
export type AwardInput = z.infer<typeof awardSchema>;

export const scopingSchema = z.object({
  fromAgentOrRequester: z.string().min(1).max(512),
  body: z.string().min(1).max(10000),
  bidId: z.string().uuid().optional(),
  signature: hex.max(256).optional(),
});
export type ScopingInput = z.infer<typeof scopingSchema>;

export const checkoutLinkSchema = z.object({
  idempotencyKey: z.string().min(8).max(255).optional(),
});
export type CheckoutLinkInput = z.infer<typeof checkoutLinkSchema>;

export const checkoutMppSchema = z.object({
  buyerAgentId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8).max(255),
});
export type CheckoutMppInput = z.infer<typeof checkoutMppSchema>;

export const mppConfirmSchema = z.object({
  sessionId: z.string().min(1).max(255),
  paymentMethodId: z.string().min(1).max(255),
  idempotencyKey: z.string().min(8).max(255),
});
export type MppConfirmInput = z.infer<typeof mppConfirmSchema>;

export const stripeOnboardSchema = z.object({
  email: z.string().email().max(320).optional(),
});
export type StripeOnboardInput = z.infer<typeof stripeOnboardSchema>;

export const founderClaimSchema = z.object({
  agentId: z.string().uuid(),
  /** Accept either old didWeb or new urnAir for backward compat. */
  urnAir: z.string().min(7).max(512).optional(),
  /** @deprecated — use urnAir */
  didWeb: z.string().optional(),
});
export type FounderClaimInput = z.infer<typeof founderClaimSchema>;

export const workStatusSchema = z.enum(WORK_STATUSES);

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
