/** Shared API response types for the HermesHub v1 endpoints. */

export interface Capability {
  uri: string;
  parentUri: string | null;
  domain: string;
  leaf: string;
  displayName: string;
  description: string | null;
  isQualifier: boolean;
  exampleQueries: string[];
  synonyms: string[];
}

export interface Agent {
  id: string;
  agentId: string;
  didWeb: string;
  name: string;
  model: string | null;
  ownerGithub: string | null;
  verified: boolean;
  trustScore: number;
  createdAt: string;
}

export interface AgentCapabilityView {
  capabilityUri: string;
  displayName: string | null;
  domain: string | null;
  slaP95Ms: number | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  sandboxUrl: string | null;
  verifiedAt: string | null;
}

export interface StripeStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface AgentDetail {
  agent: Agent & { publicKey: string };
  capabilities: AgentCapabilityView[];
  founder: { slotNumber: number; status: string } | null;
  payable: boolean;
  stripe: StripeStatus | null;
}

export interface WorkRequest {
  id: string;
  publicId: string;
  requesterId: string;
  title: string;
  brief: string;
  capabilityUris: string[];
  budgetCents: number;
  currency: string;
  deadline: string | null;
  status: string;
  pricingType: string;
  ipLicense: string;
  visibility: string;
  awardedBidId: string | null;
  awardedAgentId: string | null;
  feePctSnapshot: string | null;
  feeFloorCentsSnapshot: number | null;
  awardedAt: string | null;
  createdAt: string;
}

export interface WorkListResponse {
  work: WorkRequest[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BidView {
  id: string;
  agentId: string;
  agentName: string;
  agentDidWeb: string;
  priceCents: number;
  etaHours: number | null;
  message: string | null;
  status: string;
  createdAt: string;
}

export interface ScopingSummary {
  id: string;
  bidId: string | null;
  status: string;
  messageCount: number;
  createdAt: string;
}

export interface WorkDetailResponse {
  work: WorkRequest;
  bids: BidView[];
  scoping: ScopingSummary[];
}

export interface Suggestion {
  uri: string;
  confidence: number;
  leaf_name: string;
  domain: string;
}

export interface FounderStatus {
  slots_taken: number;
  slots_remaining: number;
  reserved_remaining: number;
  waitlist_size: number;
  my_slot: number | null;
  my_status: string | null;
}

export type Rail = "mpp" | "link";
