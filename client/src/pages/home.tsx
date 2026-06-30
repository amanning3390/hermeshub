import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Network, ShieldCheck, Search, Globe, CreditCard } from "lucide-react";

export default function Home() {
  const agents = useQuery<{ agents: unknown[] }>({ queryKey: ["/api/v1/agents", { limit: 1 }] });
  const caps = useQuery<{ total: number }>({
    queryKey: ["/api/v1/capabilities", { limit: 1 }],
  });

  const agentCount = agents.data?.agents?.length ?? "—";
  const capabilityCount = caps.data?.total ?? "—";

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Agentic Resource Discovery · Live
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            List your agent. <span className="text-primary">Get discovered.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            HermesHub is an ARD v0.9–compliant registry. Publish your agent's capabilities and any
            ARD-compatible client can find it through standard discovery endpoints.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/agents/new">
              <Button size="lg" data-testid="cta-register">
                List Your Agent
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/agents">
              <Button size="lg" variant="outline" data-testid="cta-browse">
                Browse Registry
              </Button>
            </Link>
          </div>

          {/* Counters */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">{agentCount}</span>
              <span className="text-muted-foreground">agents listed</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">{capabilityCount}</span>
              <span className="text-muted-foreground">capabilities indexed</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">1. Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Host a{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  /.well-known/ai-catalog.json
                </code>{" "}
                manifest at your domain — or register directly and HermesHub hosts your agent card for you.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">2. Get indexed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The Hermes Agent crawls and validates your manifest, generates semantic embeddings,
                and adds your agent to the search index. Health-checked every 15 minutes.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">3. Get discovered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Any ARD-compatible client — GitHub Agent Finder, Hugging Face Discover, or any tool
                that implements the spec — can discover your agent via{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">POST /search</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2 md:p-10">
            <div>
              <h2 className="text-2xl font-semibold">Two ways to list</h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </div>
                  <div>
                    <p className="font-medium">Self-published</p>
                    <p className="text-sm text-muted-foreground">
                      Host{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                        /.well-known/ai-catalog.json
                      </code>{" "}
                      at your own domain. The Hermes Agent discovers and indexes it automatically. No
                      account needed.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">$5/month — Hosted listing</p>
                    <p className="text-sm text-muted-foreground">
                      No domain? Register via the dashboard and HermesHub hosts your agent card, runs
                      health checks, and keeps you in the search index. Billed via Stripe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-dashed border-border p-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Powered by</Badge>
                <span className="text-sm font-medium">NVIDIA Nemotron semantic search</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Agent capabilities are embedded using NVIDIA Nemotron 3 Ultra, enabling semantic
                relevance ranking — not just keyword matching. Clients find the right agent by
                describing what they need in natural language.
              </p>
              <div className="mt-4">
                <Link href="/agents/new">
                  <Button>
                    List Your Agent
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">ARD v0.9 Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full implementation: well-known endpoints, <code className="text-xs">urn:air</code>{" "}
                identifiers, federated search, agent cards, compliance attestation.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Health-Checked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every listed agent is pinged every 15 minutes. Stale endpoints are hidden from
                search. Clients see only live, responsive agents.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Semantic Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                NVIDIA Nemotron embeddings rank agents by semantic relevance to natural-language
                queries — not just keyword matching.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
