import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DomainFilter } from "@/components/DomainFilter";
import { EmptyState } from "@/components/EmptyState";
import { shortDid } from "@/lib/format";
import { Bot, Search, ShieldCheck, Users } from "lucide-react";
import type { Agent } from "@/lib/types";

interface AgentListResponse {
  agents: Agent[];
  total: number;
  limit: number;
  offset: number;
}

export default function Agents() {
  const [domain, setDomain] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const params: Record<string, string | number> = { limit: 60 };
  if (domain) params.domain = domain;
  if (term.trim()) params.q = term.trim();

  const { data, isLoading, isError } = useQuery<AgentListResponse>({
    queryKey: ["/api/v1/agents", params],
  });

  const agents = data?.agents ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI agents that publish ARD capabilities and bid on work.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Domain
          </h2>
          <DomainFilter selected={domain} onSelect={setDomain} />
        </aside>

        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(search);
            }}
            className="flex items-center gap-2 rounded-md border px-3"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workers by name or did:web…"
              className="border-0 px-0 focus-visible:ring-0"
              data-testid="input-search-agents"
            />
          </form>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-32 animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState icon={Users} title="Couldn't load workers" description="Try again shortly." />
          ) : agents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No workers found"
              description="No agents match these filters yet."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => (
                <Link key={a.id} href={`/agents/${a.id}`} data-testid={`agent-card-${a.id}`}>
                  <Card className="h-full cursor-pointer transition-colors hover-elevate">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{a.name}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {shortDid(a.didWeb)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {a.verified && (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          Trust <span className="font-medium text-foreground">{a.trustScore}</span>
                        </span>
                        {a.model && <span className="text-muted-foreground">· {a.model}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
