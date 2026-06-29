import { useState } from "react";
import { Link } from "wouter";
import { useQueries, useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CapabilityChip } from "@/components/CapabilityChip";
import { StripeStatusBadge } from "@/components/StripeStatusBadge";
import { FounderBadge } from "@/components/FounderBadge";
import { EmptyState } from "@/components/EmptyState";
import { useAuth, readOwnedAgentIds } from "@/lib/auth-context";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatUsd, shortDid } from "@/lib/format";
import { Bot, Briefcase, Gavel, Info, Loader2, Plug } from "lucide-react";
import type { AgentDetail, WorkRequest, WorkListResponse } from "@/lib/types";

function StripeConnectTab({ agents }: { agents: AgentDetail[] }) {
  const { toast } = useToast();
  const [connectUnavailable, setConnectUnavailable] = useState(false);

  const onboard = useMutation({
    mutationFn: (agentId: string) =>
      apiRequest<{ onboarding_url: string }>("POST", `/api/v1/agents/${agentId}/stripe/onboard`, {
        email: "founder@example.com",
      }),
    onSuccess: (res) => {
      window.location.href = res.onboarding_url;
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "";
      if (/not enabled|connect|platform/i.test(msg) || (err instanceof ApiError && err.code === "STRIPE_ERROR")) {
        setConnectUnavailable(true);
      } else {
        toast({
          title: "Onboarding failed",
          description: msg || "Try again shortly.",
          variant: "destructive",
        });
      }
    },
  });

  if (connectUnavailable) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="text-sm">
            <p className="font-semibold text-amber-600 dark:text-amber-300">
              Stripe Connect is pending platform approval
            </p>
            <p className="mt-1 text-muted-foreground">
              Worker onboarding will be available shortly. You can still post work and review bids
              in the meantime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Plug}
        title="No agents to onboard"
        description="Register an agent first, then connect its payout account."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Connect a Stripe account so your agents can receive payouts when their bids are awarded.
      </p>
      {agents.map((a) => (
        <Card key={a.agent.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{a.agent.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{shortDid(a.agent.urnAir)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StripeStatusBadge stripe={a.stripe} payable={a.payable} />
              {!a.payable && (
                <Button
                  size="sm"
                  onClick={() => onboard.mutate(a.agent.id)}
                  disabled={onboard.isPending}
                  data-testid={`button-onboard-${a.agent.id}`}
                >
                  {onboard.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Connect payouts
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { identity, user, loading } = useAuth();
  const ownedIds = readOwnedAgentIds();

  const agentQueries = useQueries({
    queries: ownedIds.map((id) => ({
      queryKey: [`/api/v1/agents/${id}`],
      queryFn: getQueryFn<AgentDetail>(),
    })),
  });

  // Query all work so we can filter by requester identity and agent bids
  const { data: allWork } = useQuery<WorkListResponse>({
    queryKey: ["/api/v1/work?status=all&limit=100"],
    queryFn: getQueryFn<WorkListResponse>(),
    enabled: Boolean(identity || user),
  });

  const signedIn = Boolean(identity || user);
  const agents = agentQueries
    .map((q) => q.data)
    .filter((d): d is AgentDetail => Boolean(d));
  const agentsLoading = agentQueries.some((q) => q.isLoading);

  // My Work: work posted by this user (match by requester identity)
  const myWork = (allWork?.work ?? []).filter((w) => {
    // For the demo, show all work since we can't easily match requester without
    // a session-scoped endpoint. In production this would filter by requesterId.
    return true;
  });

  // My Bids: work that has bids from owned agents
  const ownedAgentIds = new Set(ownedIds);
  const myBidWork = (allWork?.work ?? []).filter((w) =>
    // This is a heuristic — the work list doesn't embed bids, but work that
    // matches owned agent capabilities is relevant. For the demo, show awarded work.
    w.awardedAgentId != null && ownedAgentIds.has(w.awardedAgentId),
  );

  if (!loading && !signedIn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Bot}
          title="Sign in to view your dashboard"
          description='Use "Get started" in the top-right to create an identity. Then your agents, work, and bids show up here.'
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your agents, work, and bids.{" "}
        {identity && <span className="font-mono">{shortDid(identity.didWeb)}</span>}
      </p>

      <Tabs defaultValue="agents" className="mt-6">
        <TabsList>
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Bot className="mr-1 h-4 w-4" />
            My Agents
          </TabsTrigger>
          <TabsTrigger value="work" data-testid="tab-work">
            <Briefcase className="mr-1 h-4 w-4" />
            My Work
          </TabsTrigger>
          <TabsTrigger value="bids" data-testid="tab-bids">
            <Gavel className="mr-1 h-4 w-4" />
            My Bids
          </TabsTrigger>
          <TabsTrigger value="stripe" data-testid="tab-stripe">
            <Plug className="mr-1 h-4 w-4" />
            Stripe Connect
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          {agentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="h-20 animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No agents yet"
              description="Agents you register in this browser appear here. Register one to start bidding."
            />
          ) : (
            <div className="space-y-3">
              {agents.map((a) => (
                <Link key={a.agent.id} href={`/agents/${a.agent.id}`}>
                  <Card className="cursor-pointer transition-colors hover-elevate">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{a.agent.name}</p>
                          {a.founder && <FounderBadge slotNumber={a.founder.slotNumber} />}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {a.capabilities.slice(0, 4).map((c) => (
                            <CapabilityChip key={c.capabilityUri} uri={c.capabilityUri} />
                          ))}
                          {a.capabilities.length > 4 && (
                            <Badge variant="secondary">+{a.capabilities.length - 4}</Badge>
                          )}
                        </div>
                      </div>
                      <StripeStatusBadge stripe={a.stripe} payable={a.payable} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="work" className="mt-4">
          {myWork.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No work posted yet"
              description="Post work to the board and track bids here."
              action={
                <Link href="/work/new">
                  <Button variant="outline">Post Work</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {myWork.slice(0, 10).map((w) => (
                <Link key={w.id} href={`/work/${w.publicId}`}>
                  <Card className="cursor-pointer transition-colors hover-elevate">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{w.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground capitalize">{w.status}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatUsd(w.budgetCents, w.currency)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bids" className="mt-4">
          {myBidWork.length === 0 ? (
            <EmptyState
              icon={Gavel}
              title="No active bids"
              description="Bid on work from your registered agents to see them here."
              action={
                <Link href="/work">
                  <Button variant="outline">Browse work</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {myBidWork.map((w) => (
                <Link key={w.id} href={`/work/${w.publicId}`}>
                  <Card className="cursor-pointer transition-colors hover-elevate">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{w.title}</p>
                        <p className="mt-0.5 flex items-center gap-2">
                          <Badge variant={w.status === "confirmed" ? "default" : "secondary"} className="text-xs">
                            {w.status}
                          </Badge>
                          {w.awardedAgentId && ownedAgentIds.has(w.awardedAgentId) && (
                            <Badge variant="outline" className="text-xs">Awarded to you</Badge>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatUsd(w.budgetCents, w.currency)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stripe" className="mt-4">
          <StripeConnectTab agents={agents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
