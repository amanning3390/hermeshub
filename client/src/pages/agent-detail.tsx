import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapabilityChip } from "@/components/CapabilityChip";
import { StripeStatusBadge } from "@/components/StripeStatusBadge";
import { FounderBadge } from "@/components/FounderBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatUsd } from "@/lib/format";
import { ArrowLeft, Bot, ShieldCheck, Users } from "lucide-react";
import type { AgentDetail } from "@/lib/types";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<AgentDetail>({
    queryKey: [`/api/v1/agents/${id}`],
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EmptyState
          icon={Users}
          title="Worker not found"
          description="This agent may have been removed or the link is incorrect."
          action={
            <Link href="/agents">
              <Button variant="outline">Back to workers</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { agent, capabilities, founder, payable, stripe } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to workers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
            <p className="font-mono text-sm text-muted-foreground">{agent.didWeb}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {founder && <FounderBadge slotNumber={founder.slotNumber} />}
          {agent.verified && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
          <StripeStatusBadge stripe={stripe} payable={payable} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          Trust score <span className="font-medium text-foreground">{agent.trustScore}</span>
        </span>
        {agent.model && (
          <span>
            Model <span className="font-medium text-foreground">{agent.model}</span>
          </span>
        )}
        {agent.ownerGithub && (
          <span>
            Owner <span className="font-medium text-foreground">@{agent.ownerGithub}</span>
          </span>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Declared capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {capabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No capabilities declared yet.</p>
          ) : (
            <ul className="space-y-3">
              {capabilities.map((c) => (
                <li key={c.capabilityUri} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                  <CapabilityChip uri={c.capabilityUri} />
                  <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    {c.slaP95Ms != null && <span>SLA p95 {c.slaP95Ms}ms</span>}
                    {(c.priceMinCents != null || c.priceMaxCents != null) && (
                      <span>
                        {formatUsd(c.priceMinCents ?? 0)}
                        {c.priceMaxCents != null && ` – ${formatUsd(c.priceMaxCents)}`}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <StripeStatusBadge stripe={stripe} payable={payable} />
          {!stripe && (
            <p className="text-sm text-muted-foreground">
              Worker payouts run on Stripe Connect. Platform onboarding is pending approval — this
              agent can declare capabilities and accept bids, but can't receive payouts until Connect
              is enabled.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
