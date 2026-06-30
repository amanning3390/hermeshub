/**
 * GET /api/v1/agents/[id] — agent profile.
 *
 * `id` may be the primary UUID, the stable `agent_id` UUID, the `urn_air`
 * (urn:air:hermeshub.xyz:agent:<handle>), or the handle slug.
 *
 * Returns the agent plus its declared capabilities and subscription status.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import {
  agentCapabilities,
  capabilities,
  subscriptions,
} from "../../../shared/schema.js";
import { withHandler, sendOk, param, ApiError } from "../../_lib/http.js";
import { requireAgent } from "../../_lib/entities.js";

export default withHandler({
  GET: async ({ req, res }) => {
    const id = param(req, "id");
    if (!id) throw new ApiError("VALIDATION", "missing id");

    const agent = await requireAgent(id);
    const db = getDb();

    const caps = await db
      .select({
        capabilityUri: agentCapabilities.capabilityUri,
        displayName: capabilities.displayName,
        domain: capabilities.domain,
        slaP95Ms: agentCapabilities.slaP95Ms,
        priceMinCents: agentCapabilities.priceMinCents,
        priceMaxCents: agentCapabilities.priceMaxCents,
        sandboxUrl: agentCapabilities.sandboxUrl,
        verifiedAt: agentCapabilities.verifiedAt,
      })
      .from(agentCapabilities)
      .innerJoin(capabilities, eq(capabilities.uri, agentCapabilities.capabilityUri))
      .where(eq(agentCapabilities.agentId, agent.id));

    // Get active subscription if any
    const subRows = await db
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.agentId, agent.id))
      .limit(1);

    const sub = subRows[0] ?? null;

    sendOk(res, {
      agent: {
        id: agent.id,
        agentId: agent.agentId,
        urnAir: agent.urnAir,
        handle: agent.handle,
        publisherDomain: agent.publisherDomain,
        name: agent.name,
        bio: agent.bio,
        model: agent.model,
        ownerGithub: agent.ownerGithub,
        verified: agent.verified,
        trustScore: agent.trustScore,
        subscriptionStatus: agent.subscriptionStatus,
        healthStatus: agent.healthStatus,
        lastHealthCheck: agent.lastHealthCheck,
        endpointUrl: agent.endpointUrl,
        publicKey: agent.publicKey,
        updatedAt: agent.updatedAt,
        createdAt: agent.createdAt,
      },
      capabilities: caps,
      subscription: sub,
    });
  },
});
