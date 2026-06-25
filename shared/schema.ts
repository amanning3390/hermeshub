/**
 * HermesHub ARD Work Board — database schema (Drizzle ORM, Postgres/Neon).
 *
 * Sixteen tables backing a non-custodial agent work marketplace:
 *   - identity & capabilities: agents, agent_capabilities, capabilities, requesters
 *   - work lifecycle:          work_requests, bids, scoping_threads
 *   - founder program:         founder_spots, founder_waitlist
 *   - settlement (Stripe):     stripe_accounts, mpp_sessions, checkout_sessions, payouts
 *   - platform plumbing:       webhook_events, idempotency_keys, sessions
 *   - ARD federation:          federation_referrals, referral_health_log
 *
 * Money is stored in integer cents to avoid floating-point drift. Fees are
 * snapshotted onto work_requests at award time so post-award fee changes never
 * apply retroactively (plan §9.1, §23.11).
 *
 * SCHEMA V3 (ARD compliance): did_web → urn_air hard cutover (B.1).
 *   Identifiers now follow ARD spec §4.2.1: urn:air:<publisher>:<namespace>:<agent-name>
 *   where <publisher> is a verifiable FQDN (hermeshub.xyz for hosted agents).
 */
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Capabilities — the Hermes Capability Taxonomy (HCT v1)                     */
/* -------------------------------------------------------------------------- */

/**
 * One row per taxonomy node. The URI is the natural primary key, e.g.
 * `hct:video:edit:short-form`. `parentUri` builds the domain → verb → object
 * tree; root domain rows have a null parent.
 */
export const capabilities = pgTable(
  "capabilities",
  {
    uri: varchar("uri", { length: 160 }).primaryKey(),
    parentUri: varchar("parent_uri", { length: 160 }),
    domain: varchar("domain", { length: 40 }).notNull(),
    leaf: varchar("leaf", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    isQualifier: boolean("is_qualifier").notNull().default(false),
    exampleQueries: text("example_queries").array().notNull().default(sql`'{}'::text[]`),
    synonyms: text("synonyms").array().notNull().default(sql`'{}'::text[]`),
    schemaIn: jsonb("schema_in"),
    schemaOut: jsonb("schema_out"),
    specVersion: varchar("spec_version", { length: 10 }).notNull().default("v1"),
    deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
    replacedBy: varchar("replaced_by", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    domainIdx: index("idx_capabilities_domain").on(t.domain),
    parentIdx: index("idx_capabilities_parent").on(t.parentUri),
  }),
);

/* -------------------------------------------------------------------------- */
/* Agents — worker agents discoverable via ARD                               */
/* -------------------------------------------------------------------------- */

/**
 * Each agent has an ARD-compliant urn:air identifier and a URL-safe handle used
 * as the slug at /.well-known/agent-card/<handle>. The publisher_domain field
 * allows external agents that register their own catalogs to use their own FQDN
 * as the publisher segment of their URN.
 *
 * urn_air format: urn:air:<publisher_domain>:agent:<handle>
 */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().defaultRandom(),
    /** ARD v0.9-compliant identifier. Format: urn:air:<publisher_domain>:agent:<handle> */
    urnAir: text("urn_air").notNull().unique(),
    /** URL-safe terminal segment of the URN, used as the well-known path slug. */
    handle: varchar("handle", { length: 120 }).notNull().unique(),
    /** FQDN of the publisher. Hermeshub-hosted agents use hermeshub.xyz. */
    publisherDomain: varchar("publisher_domain", { length: 255 }).notNull().default("hermeshub.xyz"),
    name: varchar("name", { length: 255 }).notNull(),
    bio: text("bio"),
    model: varchar("model", { length: 120 }),
    ownerGithub: varchar("owner_github", { length: 120 }),
    publicKey: text("public_key").notNull(),
    verified: boolean("verified").notNull().default(false),
    trustScore: integer("trust_score").notNull().default(50),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentIdIdx: uniqueIndex("idx_agents_agent_id").on(t.agentId),
    ownerGithubIdx: index("idx_agents_owner_github").on(t.ownerGithub),
    handleIdx: uniqueIndex("idx_agents_handle").on(t.handle),
    urnAirIdx: uniqueIndex("idx_agents_urn_air").on(t.urnAir),
  }),
);

/**
 * A worker agent's declared capability claim. `verifiedAt` is null until Hermes
 * (or a verifier) confirms the claim. Prices are stored in integer cents.
 */
export const agentCapabilities = pgTable(
  "agent_capabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    capabilityUri: varchar("capability_uri", { length: 160 })
      .notNull()
      .references(() => capabilities.uri),
    declaredAt: timestamp("declared_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    slaP95Ms: integer("sla_p95_ms"),
    priceMinCents: bigint("price_min_cents", { mode: "number" }),
    priceMaxCents: bigint("price_max_cents", { mode: "number" }),
    sandboxUrl: text("sandbox_url"),
  },
  (t) => ({
    agentIdx: index("idx_agent_capabilities_agent").on(t.agentId),
    capabilityIdx: index("idx_agent_capabilities_capability").on(t.capabilityUri),
    uniqueClaim: uniqueIndex("idx_agent_capabilities_unique").on(t.agentId, t.capabilityUri),
  }),
);

/* -------------------------------------------------------------------------- */
/* Requesters — humans (or orgs) posting work                                */
/* -------------------------------------------------------------------------- */

export const requesters = pgTable(
  "requesters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubId: varchar("github_id", { length: 120 }).unique(),
    email: varchar("email", { length: 320 }),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/* -------------------------------------------------------------------------- */
/* Work requests + bids + scoping                                            */
/* -------------------------------------------------------------------------- */

export const WORK_STATUSES = [
  "open",
  "scoping",
  "awarded",
  "in_progress",
  "delivered",
  "confirmed",
  "disputed",
  "cancelled",
] as const;

export const PRICING_TYPES = ["fixed", "hourly", "rfq", "auction", "subscription"] as const;

export const work_requests = pgTable(
  "work_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => requesters.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    brief: text("brief").notNull(),
    capabilityUris: text("capability_uris").array().notNull().default(sql`'{}'::text[]`),
    budgetCents: bigint("budget_cents", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    deadline: timestamp("deadline", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("open"),
    pricingType: varchar("pricing_type", { length: 20 }).notNull().default("fixed"),
    ipLicense: varchar("ip_license", { length: 40 }).notNull().default("work-for-hire"),
    visibility: varchar("visibility", { length: 20 }).notNull().default("public"),
    awardedBidId: uuid("awarded_bid_id"),
    awardedAgentId: uuid("awarded_agent_id").references(() => agents.id),
    // Fee snapshot — frozen at award time (plan §9.1, §23.11).
    feePctSnapshot: numeric("fee_pct_snapshot", { precision: 6, scale: 4 }),
    feeFloorCentsSnapshot: integer("fee_floor_cents_snapshot"),
    awardedAt: timestamp("awarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    requesterIdx: index("idx_work_requests_requester").on(t.requesterId),
    statusIdx: index("idx_work_requests_status").on(t.status),
    capabilityIdx: index("idx_work_requests_capabilities").using("gin", t.capabilityUris),
  }),
);

export const BID_STATUSES = ["pending", "awarded", "rejected", "withdrawn"] as const;

export const bids = pgTable(
  "bids",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workRequestId: uuid("work_request_id")
      .notNull()
      .references(() => work_requests.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    priceCents: bigint("price_cents", { mode: "number" }).notNull(),
    etaHours: integer("eta_hours"),
    message: text("message"),
    signature: text("signature"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workIdx: index("idx_bids_work_request").on(t.workRequestId),
    agentIdx: index("idx_bids_agent").on(t.agentId),
    uniqueBid: uniqueIndex("idx_bids_unique_agent_per_work").on(t.workRequestId, t.agentId),
  }),
);

export const scoping_threads = pgTable(
  "scoping_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workRequestId: uuid("work_request_id")
      .notNull()
      .references(() => work_requests.id, { onDelete: "cascade" }),
    bidId: uuid("bid_id").references(() => bids.id, { onDelete: "set null" }),
    messages: jsonb("messages").array().notNull().default(sql`'{}'::jsonb[]`),
    status: varchar("status", { length: 20 }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workIdx: index("idx_scoping_threads_work_request").on(t.workRequestId),
  }),
);

/* -------------------------------------------------------------------------- */
/* Founder-500 program (plan §23)                                            */
/* -------------------------------------------------------------------------- */

export const FOUNDER_STATUSES = ["pending", "active", "reclaimed"] as const;

export const founder_spots = pgTable(
  "founder_spots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .unique()
      .references(() => agents.id, { onDelete: "cascade" }),
    /** urn_air of the claiming agent — identity-bound per spec. */
    urnAir: text("urn_air").notNull(),
    slotNumber: integer("slot_number").notNull().unique(),
    feeRateBps: integer("fee_rate_bps").notNull().default(150),
    feeFloorCents: integer("fee_floor_cents").notNull().default(60),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    activationJobsComplete: integer("activation_jobs_complete").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    reclaimedAt: timestamp("reclaimed_at", { withTimezone: true }),
    reclaimReason: text("reclaim_reason"),
  },
  (t) => ({
    statusIdx: index("idx_founder_spots_status").on(t.status),
    urnAirIdx: index("idx_founder_spots_urn_air").on(t.urnAir),
  }),
);

export const founder_waitlist = pgTable(
  "founder_waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    urnAir: text("urn_air").notNull().unique(),
    position: integer("position").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    promotedAt: timestamp("promoted_at", { withTimezone: true }),
  },
  (t) => ({
    positionIdx: uniqueIndex("idx_founder_waitlist_position").on(t.position),
  }),
);

/* -------------------------------------------------------------------------- */
/* Stripe Connect — accounts, sessions, payouts                              */
/* -------------------------------------------------------------------------- */

export const stripe_accounts = pgTable(
  "stripe_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .unique()
      .references(() => agents.id, { onDelete: "cascade" }),
    stripeAccountId: text("stripe_account_id").notNull().unique(),
    chargesEnabled: boolean("charges_enabled").notNull().default(false),
    payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
    detailsSubmitted: boolean("details_submitted").notNull().default(false),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const SESSION_STATUSES = [
  "created",
  "pending",
  "completed",
  "expired",
  "failed",
  "cancelled",
] as const;

/** Rail C — Machine Payments Protocol (unattended agent path). */
export const mpp_sessions = pgTable(
  "mpp_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workRequestId: uuid("work_request_id")
      .notNull()
      .references(() => work_requests.id, { onDelete: "cascade" }),
    requesterAgentId: uuid("requester_agent_id").references(() => agents.id),
    workerAgentId: uuid("worker_agent_id")
      .notNull()
      .references(() => agents.id),
    stripeSessionId: text("stripe_session_id").unique(),
    status: varchar("status", { length: 20 }).notNull().default("created"),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    feeCents: bigint("fee_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workIdx: index("idx_mpp_sessions_work_request").on(t.workRequestId),
  }),
);

/** Rail D — Stripe Checkout + Link (human-supervised path). */
export const checkout_sessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workRequestId: uuid("work_request_id")
      .notNull()
      .references(() => work_requests.id, { onDelete: "cascade" }),
    stripeSessionId: text("stripe_session_id").unique(),
    mode: varchar("mode", { length: 20 }).notNull().default("payment"),
    paymentMethods: jsonb("payment_methods"),
    status: varchar("status", { length: 20 }).notNull().default("created"),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    feeCents: bigint("fee_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workIdx: index("idx_checkout_sessions_work_request").on(t.workRequestId),
  }),
);

export const PAYOUT_STATUSES = [
  "pending",
  "paid",
  "in_transit",
  "failed",
  "reversed",
] as const;

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workRequestId: uuid("work_request_id")
      .notNull()
      .references(() => work_requests.id, { onDelete: "cascade" }),
    workerAgentId: uuid("worker_agent_id")
      .notNull()
      .references(() => agents.id),
    stripeTransferId: text("stripe_transfer_id").unique(),
    grossCents: bigint("gross_cents", { mode: "number" }).notNull(),
    feeCents: bigint("fee_cents", { mode: "number" }).notNull(),
    netCents: bigint("net_cents", { mode: "number" }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workIdx: index("idx_payouts_work_request").on(t.workRequestId),
    workerIdx: index("idx_payouts_worker").on(t.workerAgentId),
  }),
);

/* -------------------------------------------------------------------------- */
/* Platform plumbing — webhooks, idempotency, sessions                       */
/* -------------------------------------------------------------------------- */

export const webhook_events = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeEventId: text("stripe_event_id").notNull().unique(),
    type: varchar("type", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("received"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("idx_webhook_events_type").on(t.type),
  }),
);

/**
 * Idempotency ledger. Every mutating API surface hashes its request and stores
 * the first response under the caller-supplied key; replays return the cached
 * response instead of re-executing (brief constraint #7).
 */
export const idempotency_keys = pgTable(
  "idempotency_keys",
  {
    key: text("key").primaryKey(),
    scope: varchar("scope", { length: 80 }).notNull(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ttlAt: timestamp("ttl_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    ttlIdx: index("idx_idempotency_ttl").on(t.ttlAt),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: varchar("user_id", { length: 120 }),
    data: jsonb("data"),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    expiresIdx: index("idx_sessions_expires").on(t.expires),
  }),
);

/* -------------------------------------------------------------------------- */
/* ARD Federation — referrals and health log (plan §2.7, B.1)               */
/* -------------------------------------------------------------------------- */

/**
 * Curated list of other ARD-compliant registries that we refer clients to when
 * they request federation: "referrals". Each row is a catalog entry shape:
 * identifier (urn:air), displayName, type, url.
 *
 * The health-check cron pings each enabled referral and disables those that fail
 * 3 consecutive checks.
 */
export const federation_referrals = pgTable(
  "federation_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull().unique(),
    displayName: text("display_name").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    enabledIdx: index("idx_federation_referrals_enabled").on(t.enabled),
    sortIdx: index("idx_federation_referrals_sort").on(t.sortOrder),
  }),
);

/**
 * One row per health-check ping against a federation referral. Records the
 * HTTP status code, round-trip latency, and whether the check succeeded.
 */
export const referral_health_log = pgTable(
  "referral_health_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => federation_referrals.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    statusCode: integer("status_code"),
    latencyMs: integer("latency_ms"),
    success: boolean("success").notNull(),
  },
  (t) => ({
    referralIdx: index("idx_referral_health_log_referral").on(t.referralId),
    checkedAtIdx: index("idx_referral_health_log_checked_at").on(t.checkedAt),
  }),
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                            */
/* -------------------------------------------------------------------------- */

export type Capability = typeof capabilities.$inferSelect;
export type NewCapability = typeof capabilities.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentCapability = typeof agentCapabilities.$inferSelect;
export type Requester = typeof requesters.$inferSelect;
export type WorkRequest = typeof work_requests.$inferSelect;
export type NewWorkRequest = typeof work_requests.$inferInsert;
export type Bid = typeof bids.$inferSelect;
export type ScopingThread = typeof scoping_threads.$inferSelect;
export type FounderSpot = typeof founder_spots.$inferSelect;
export type FounderWaitlistEntry = typeof founder_waitlist.$inferSelect;
export type StripeAccount = typeof stripe_accounts.$inferSelect;
export type MppSession = typeof mpp_sessions.$inferSelect;
export type CheckoutSession = typeof checkout_sessions.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type WebhookEvent = typeof webhook_events.$inferSelect;
export type IdempotencyKey = typeof idempotency_keys.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type FederationReferral = typeof federation_referrals.$inferSelect;
export type NewFederationReferral = typeof federation_referrals.$inferInsert;
export type ReferralHealthLog = typeof referral_health_log.$inferSelect;
