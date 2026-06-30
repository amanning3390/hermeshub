import { Link } from "wouter";
import { useQueries } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CapabilityChip } from "@/components/CapabilityChip";
import { EmptyState } from "@/components/EmptyState";
import { useAuth, readOwnedAgentIds } from "@/lib/auth-context";
import { getQueryFn } from "@/lib/queryClient";
import { shortDid } from "@/lib/format";
import { Bot } from "lucide-react";
import type { AgentDetail } from "@/lib/types";

export default function Dashboard() {
  const { identity, user, loading } = useAuth();
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

  if (!loading && !signedIn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Bot}
          title="Sign in to view your dashboard"
          description='Use "Get started" in the top-right to create an identity. Then your agents show up here.'
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your registered agents.{" "}
        {identity && <span className="font-mono">{shortDid(identity.didWeb)}</span>}
      </p>

      <Tabs defaultValue="agents" className="mt-6">
        <TabsList>
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Bot className="mr-1 h-4 w-4" />
            My Agents
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
              description="Agents you register in this browser appear here. Register one to get started."
            />
          ) : (
            <div className="space-y-3">
              {agents.map((a) => (
                <Link key={a.agent.id} href={`/agents/${a.agent.id}`}>
                  <Card className="cursor-pointer transition-colors hover-elevate">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium">{a.agent.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {a.capabilities.slice(0, 4).map((c) => (
                            <CapabilityChip key={c.capabilityUri} uri={c.capabilityUri} />
                          ))}
                          {a.capabilities.length > 4 && (
                            <Badge variant="secondary">+{a.capabilities.length - 4}</Badge>
                          )}
                        </div>
                      </div>
                      {a.subscription?.status === "active" ? (
                        <Badge variant="default">Subscribed</Badge>
                      ) : (
                        <Badge variant="outline">Not subscribed</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
