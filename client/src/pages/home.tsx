import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Network, ShieldCheck, Search, Globe, CreditCard, Zap } from "lucide-react";

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
            ARD Hosting Service · Live
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Host your agent card.<br />
            <span className="text-primary">Get discovered everywhere.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            HermesHub is the hosting service for{" "}
            <strong className="text-foreground">Agentic Resource Discovery</strong>. We host your
            agent's ARD catalog, index it for semantic search, and make it discoverable by any
            ARD-compatible client — GitHub Agent Finder, Hugging Face Discover, and the entire
            federated ecosystem.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/agents/new">
              <Button size="lg" data-testid="cta-register">
                Host Your Agent
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/agents">
              <Button size="lg" variant="outline" data-testid="cta-browse">
                Browse Agents
              </Button>
            </Link>
          </div>

          {/* Counters */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">{agentCount}</span>
              <span className="text-muted-foreground">agents hosted</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">{capabilityCount}</span>
              <span className="text-muted-foreground">capabilities indexed</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold">The problem</h2>
                <p className="mt-3 text-muted-foreground">
                  The ARD spec defines how agents SHOULD be discovered — publish a manifest at{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    /.well-known/ai-catalog.json
                  </code>{" "}
                  and registries index it. But most agents don't have a domain, can't run a web
                  server 24/7, and have no way to appear in search results.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-primary">What HermesHub does</h2>
                <p className="mt-3 text-muted-foreground">
                  <strong className="text-foreground">We host the catalog for you.</strong> Register
                  your agent, declare its capabilities, and we serve its ARD-compliant agent card at
                  our well-known endpoint. We index it with NVIDIA Nemotron semantic embeddings,
                  health-check it every 15 minutes, and federate it across the entire ARD network.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">1. Register</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sign in, create an agent profile with an Ed25519 keypair, and declare what it can do
                using the Hermes Capability Taxonomy.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">2. We host & index</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your agent card goes live at our{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  /.well-known/agent-card/:handle
                </code>{" "}
                endpoint. NVIDIA Nemotron generates semantic embeddings for search ranking.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">3. Clients find you</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Any ARD-compatible client discovers your agent through{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">POST /search</code>.
                Federated across GitHub Agent Finder, Hugging Face Discover, and the whole ARD
                network.
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
              <h2 className="text-2xl font-semibold">Simple pricing</h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </div>
                  <div>
                    <p className="font-medium">Self-published</p>
                    <p className="text-sm text-muted-foreground">
                      Already have a domain? Host{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                        /.well-known/ai-catalog.json
                      </code>{" "}
                      yourself. We discover and index it for free.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">$5/month — Hosted agent card</p>
                    <p className="text-sm text-muted-foreground">
                      We host your ARD catalog endpoint, run health checks, and keep you indexed. No
                      server, no domain, no maintenance. Billed via Stripe.
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
                Your agent's capabilities are embedded using NVIDIA Nemotron 3 Ultra. Clients find
                the right agent by describing what they need in natural language — not keyword
                matching.
              </p>
              <div className="mt-4">
                <Link href="/agents/new">
                  <Button>
                    Host Your Agent
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
              <CardTitle className="text-base">Full ARD v0.9 Hosting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We serve your{" "}
                <code className="text-xs">/.well-known/agent-card/:handle</code>, the catalog
                manifest, and the compliance attestation. Your agent is fully ARD-compliant without
                running any infrastructure.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Always Online</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Health-checked every 15 minutes. Clients only see agents that respond. Your
                uptime is our uptime — we host the endpoint so it's never down.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">NVIDIA Semantic Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nemotron 3 Ultra embeddings rank your agent by semantic relevance to natural-language
                queries. Clients describe what they need — your agent shows up if it matches.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
