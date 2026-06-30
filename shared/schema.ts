/**
 * HermesHub ARD Agent Registry — database schema (Drizzle ORM, Postgres/Neon).
 *
 * Tables:
 *   - identity & capabilities: agents, agent_capabilities, capabilities
 *   - subscriptions (Stripe):  subscriptions
 *   - platform plumbing:       webhook_events, idempotency_keys, sessions
 *   - ARD federation:          federation_referrals, referral_health_log
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
  boolean,
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
    /** Subscription status: active, inactive, delinquent, canceled */
    subscriptionStatus: varchar("subscription_status", { length: 20 }).notNull().default("inactive"),
    /** Cached embedding vector (jsonb array of numbers) for semantic search */
    embedding: jsonb("embedding"),
    /** Health status: online, offline, stale, unknown */
    healthStatus: varchar("health_status", { length: 20 }).notNull().default("unknown"),
    lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
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
    priceMinCents: integer("price_min_cents"),
    priceMaxCents: integer("price_max_cents"),
    sandboxUrl: text("sandbox_url"),
  },
  (t) => ({
    agentIdx: index("idx_agent_capabilities_agent").on(t.agentId),
    capabilityIdx: index("idx_agent_capabilities_capability").on(t.capabilityUri),
    uniqueClaim: uniqueIndex("idx_agent_capabilities_unique").on(t.agentId, t.capabilityUri),
  }),
);

/* -------------------------------------------------------------------------- */
/* Subscriptions — $5/month subscription billing via Stripe                  */
/* -------------------------------------------------------------------------- */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentIdx: index("idx_subscriptions_agent").on(t.agentId),
    statusIdx: index("idx_subscriptions_status").on(t.status),
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
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type WebhookEvent = typeof webhook_events.$inferSelect;
export type IdempotencyKey = typeof idempotency_keys.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type FederationReferral = typeof federation_referrals.$inferSelect;
export type NewFederationReferral = typeof federation_referrals.$inferInsert;
export type ReferralHealthLog = typeof referral_health_log.$inferSelect;
