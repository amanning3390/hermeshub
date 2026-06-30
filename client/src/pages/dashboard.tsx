import { Link } from "wouter";
import { useQueries, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapabilityChip } from "@/components/CapabilityChip";
import { EmptyState } from "@/components/EmptyState";
import { useAuth, readOwnedAgentIds } from "@/lib/auth-context";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import type { AgentDetail } from "@/lib/types";

export default function Dashboard() {
  const { identity, user, loading } = useAuth();
  const { toast } = useToast();
  const ownedIds = readOwnedAgentIds();

  const agentQueries = useQueries({
    queries: ownedIds.map((id) => ({
      queryKey: [`/api/v1/agents/${id}`],
      queryFn: getQueryFn<AgentDetail>(),
    })),
  });

  const signedIn = Boolean(identity || user);
  const agents = agentQueries
    .map((q) => q.data)
    .filter((d): d is AgentDetail => Boolean(d));
  const agentsLoading = agentQueries.some((q) => q.isLoading);

  const subscribe = useMutation({
    mutationFn: (agentId: string) =>
      apiRequest<{ url: string; session_id: string }>(
        "POST",
        `/api/v1/agents/${agentId}/subscribe`,
      ),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err) => {
      toast({
        title: "Subscription failed",
        description: err instanceof ApiError ? err.message : "Try again.",
        variant: "destructive",
      });
    },
  });

  if (!loading && !signedIn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Bot}
          title="Sign in to manage your agents"
          description='Use "Sign in" to authenticate with GitHub, or "Quick start" for an instant anonymous identity.'
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your listed agents and subscriptions.
          </p>
        </div>
        <Link href="/agents/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            List New Agent
          </Button>
        </Link>
      </div>

      {agentsLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="List an agent to make it discoverable in the ARD registry."
            action={
              <Link href="/agents/new">
                <Button>
                  <Plus className="mr-1 h-4 w-4" />
                  List Your First Agent
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {agents.map((a) => (
            <Card key={a.agent.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link href={`/agents/${a.agent.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.agent.name}</p>
                      {a.subscription?.status === "active" ? (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Listed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not listed</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {a.capabilities.slice(0, 4).map((c) => (
                        <CapabilityChip key={c.capabilityUri} uri={c.capabilityUri} />
                      ))}
                      {a.capabilities.length > 4 && (
                        <Badge variant="secondary">+{a.capabilities.length - 4}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 ${
                        a.healthStatus === "online"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : a.healthStatus === "offline"
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${
                          a.healthStatus === "online"
                            ? "bg-emerald-500"
                            : a.healthStatus === "offline"
                              ? "bg-red-500"
                              : "bg-muted-foreground"
                        }`} />
                        {a.healthStatus}
                      </span>
                      <span className="font-mono">{a.agent.handle}</span>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    {a.subscription?.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => subscribe.mutate(a.agent.id)}
                        disabled={subscribe.isPending}
                      >
                        {subscribe.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1 h-4 w-4" />
                        )}
                        Subscribe $5/mo
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
