/**
 * GET /api/v1/agents/[id] — agent profile.
 *
 * `id` may be the primary UUID, the stable `agent_id` UUID, the `urn_air`
 * (urn:air:hermeshub.xyz:agent:<handle>), or the handle slug.
 *
 * Returns the agent plus its declared capabilities, founder status, and Stripe
 * payability flags (so the UI can show onboarding state).
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../_lib/db.js";
import {
  agentCapabilities,
  capabilities,
  founder_spots,
  stripe_accounts,
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

    const founderRows = await db
      .select({ slotNumber: founder_spots.slotNumber, status: founder_spots.status })
      .from(founder_spots)
      .where(eq(founder_spots.agentId, agent.id))
      .limit(1);

    const stripeRows = await db
      .select({
        chargesEnabled: stripe_accounts.chargesEnabled,
        payoutsEnabled: stripe_accounts.payoutsEnabled,
        detailsSubmitted: stripe_accounts.detailsSubmitted,
      })
      .from(stripe_accounts)
      .where(eq(stripe_accounts.agentId, agent.id))
      .limit(1);

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
        publicKey: agent.publicKey,
        updatedAt: agent.updatedAt,
        createdAt: agent.createdAt,
      },
      capabilities: caps,
      founder: founderRows[0] ?? null,
      payable: stripeRows[0]
        ? stripeRows[0].chargesEnabled && stripeRows[0].payoutsEnabled
        : false,
      stripe: stripeRows[0] ?? null,
    });
  },
});
