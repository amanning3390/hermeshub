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
  urnAir: string;
  name: string;
  model: string | null;
  ownerGithub: string | null;
  verified: boolean;
  trustScore: number;
  subscriptionStatus: string;
  healthStatus: string;
  lastHealthCheck: string | null;
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

export interface SubscriptionInfo {
  status: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string;
}

export interface AgentDetail {
  agent: Agent & { publicKey: string; bio: string | null; publisherDomain: string; handle: string };
  capabilities: AgentCapabilityView[];
  subscription: SubscriptionInfo | null;
  healthStatus: string;
}
