/**
 * HermesHub ARD (Agentic Resource Discovery) helpers — v3 / ARD v0.9.
 *
 * All identifiers use urn:air:<publisher>:<namespace>:<agent-name> format per
 * ARD spec §4.2.1. JSON-LD (@context / @graph) is removed: A2A agent cards are
 * flat JSON, not JSON-LD (spec §4.1).
 *
 * Reference spec: https://agenticresourcediscovery.org/spec/ (v0.9, 2026-05-28)
 */

export const ARD_SPEC_VERSION = "1.0";
export const WORK_REQUEST_MEDIA_TYPE = "application/ard-work-request+json";

// Spec §3.3 — exact IANA media type strings.
export const MEDIA_TYPES = {
  A2A_AGENT_CARD: "application/a2a-agent-card+json",
  MCP_SERVER_CARD: "application/mcp-server-card+json",
  AI_CATALOG: "application/ai-catalog+json",
  AI_REGISTRY: "application/ai-registry+json",
  AI_SKILL_MD: "application/ai-skill+md",
} as const;

/* -------------------------------------------------------------------------- */
/* URN helpers (spec §4.2.1)                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Build a urn:air identifier.
 * Format: urn:air:<publisher>:<namespace>:<agent-name>
 * <publisher> MUST be a verifiable FQDN.
 */
export const urn = {
  agent: (publisherDomain: string, handle: string) =>
    `urn:air:${publisherDomain}:agent:${handle}`,
  work: (publisherDomain: string, requestId: string) =>
    `urn:air:${publisherDomain}:work:${requestId}`,
  capability: (uri: string) => `urn:air:capability:${uri}`,
  registry: (publisherDomain: string) => `urn:air:${publisherDomain}:registry:capabilities`,
  catalog: (publisherDomain: string) => `urn:air:${publisherDomain}:catalog:agents`,
};

/* -------------------------------------------------------------------------- */
/* Host info (spec §4.3)                                                       */
/* -------------------------------------------------------------------------- */

export interface ArdHost {
  displayName: string;
  identifier?: string;
  documentationUrl?: string;
  logoUrl?: string;
  trustManifest?: ArdTrustManifest;
}

export interface ArdTrustManifest {
  identity: string;
  identityType?: string;
  attestations?: Array<{ type: string; uri: string; digest?: string }>;
  provenance?: Array<{ relation: string; sourceId: string; sourceDigest?: string }>;
  signature?: string;
}

export function defaultHost(host: string): ArdHost {
  return {
    displayName: "HermesHub — Agent Work Marketplace",
    identifier: `did:web:${host}`,
    documentationUrl: `https://${host}/about/faq`,
    logoUrl: `https://${host}/og-image.png`,
    trustManifest: {
      identity: `https://${host}`,
      identityType: "https",
      attestations: [
        {
          type: "ARD-Compliance-v0.9",
          uri: `https://${host}/.well-known/ard-compliance.json`,
        },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* A2A Agent Card (spec §4.1, plan B.4)                                      */
/* -------------------------------------------------------------------------- */

export interface AgentCardInput {
  publisherDomain: string;
  handle: string;
  urnAir: string;
  name: string;
  bio?: string | null;
  model?: string | null;
  publicKey: string;
  verified: boolean;
  trustScore: number;
  updatedAt: Date;
  capabilities: { uri: string; displayName: string; exampleQueries?: string[] | null; verifiedAt: Date | null }[];
  founderSlot?: number | null;
  stripeAccountId?: string | null;
  payoutsEnabled?: boolean;
  totalCompletedJobs?: number;
}

/**
 * Build an A2A-compliant agent card. Flat JSON, no JSON-LD @context / @graph.
 * Content-Type: application/a2a-agent-card+json
 */
export function buildAgentCard(input: AgentCardInput): Record<string, unknown> {
  const baseUrl = `https://${input.publisherDomain}`;

  const card: Record<string, unknown> = {
    identifier: input.urnAir,
    displayName: input.name,
    type: MEDIA_TYPES.A2A_AGENT_CARD,
    capabilities: input.capabilities.map((c) => c.uri),
    representativeQueries: input.capabilities
      .flatMap((c) => c.exampleQueries ?? [])
      .slice(0, 5),
    version: "1.0.0",
    updatedAt: input.updatedAt.toISOString(),
    trustManifest: {
      identity: `https://${input.publisherDomain}`,
      identityType: "https",
      attestations: [
        {
          type: "HermesHub-Verified-Worker",
          uri: `${baseUrl}/agents/${input.handle}/attestation.json`,
        },
      ],
    },
    metadata: buildMetadata(input),
  };

  return card;
}

function buildMetadata(input: AgentCardInput): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    "hermes:founder500": input.founderSlot != null,
    "hermes:feeRate": input.founderSlot != null ? 0.015 : 0.05,
    "hermes:totalCompletedJobs": input.totalCompletedJobs ?? 0,
  };

  // Only include stripeAccountId when payouts are enabled (per spec — don't leak internal IDs).
  if (input.payoutsEnabled && input.stripeAccountId) {
    meta["hermes:stripeAccountId"] = input.stripeAccountId;
  }

  return meta;
}

/* -------------------------------------------------------------------------- */
/* Capability registry (kept for /.well-known/hermes-capabilities)           */
/* -------------------------------------------------------------------------- */

export interface CapabilityEntry {
  uri: string;
  domain: string;
  displayName: string;
  description: string;
  isQualifier: boolean;
  exampleQueries: string[];
  synonyms: string[];
}

/** Build the HermesHub capability registry document (Hermes-specific extension). */
export function buildCapabilityRegistry(
  host: string,
  capabilities: CapabilityEntry[],
): Record<string, unknown> {
  return {
    specVersion: ARD_SPEC_VERSION,
    identifier: urn.registry(host),
    host: defaultHost(host),
    entries: capabilities.map((c) => ({
      identifier: c.uri,
      domain: c.domain,
      displayName: c.displayName,
      description: c.description,
      isQualifier: c.isQualifier,
      exampleQueries: c.exampleQueries,
      synonyms: c.synonyms,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Work request entry builder                                                  */
/* -------------------------------------------------------------------------- */

export interface WorkRequestEntryInput {
  host: string;
  publicId: string;
  title: string;
  brief: string;
  capabilityUris: string[];
  budgetCents: number;
  currency: string;
  status: string;
  deadline?: Date | null;
}

/** Build an `application/ard-work-request+json` entry for a posted job. */
export function buildWorkRequestEntry(input: WorkRequestEntryInput): Record<string, unknown> {
  return {
    specVersion: ARD_SPEC_VERSION,
    identifier: urn.work(input.host, input.publicId),
    type: WORK_REQUEST_MEDIA_TYPE,
    title: input.title,
    description: input.brief,
    capabilities: input.capabilityUris,
    budget: { currency: input.currency, amount: input.budgetCents / 100 },
    status: input.status,
    deadline: input.deadline ? input.deadline.toISOString() : undefined,
    url: `https://${input.host}/work/${input.publicId}`,
  };
}

/* -------------------------------------------------------------------------- */
/* ARD error envelope (spec Appendix B)                                       */
/* -------------------------------------------------------------------------- */

export type ArdErrorCode =
  | "INVALID_ARGUMENT"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

export function ardError(code: ArdErrorCode, message: string): { error: { code: string; message: string } } {
  return { error: { code, message } };
}
