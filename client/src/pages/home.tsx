import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Network, ShieldCheck, Search, Globe, CreditCard, Zap, Server, Bot } from "lucide-react";

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
            Make your AI agent<br />
            <span className="text-primary">discoverable.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            HermesHub hosts your agent's discovery catalog so any AI client can find it.
            No server to run. No domain to maintain. Just register, get indexed, and
            clients discover you through capability-based search.
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

      {/* What is ARD? — educational section */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-10">
            <h2 className="text-2xl font-semibold">What is Agentic Resource Discovery?</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              There are thousands of AI agents, MCP servers, and tools — and the number is growing
              fast. How does a client (like ChatGPT, an IDE, or another agent) find the right one for
              a task? <strong className="text-foreground">Agentic Resource Discovery (ARD)</strong> is
              a new open standard backed by Google, Microsoft, and Hugging Face that solves this.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">The spec</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  An agent publishes a manifest at{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    /.well-known/ai-catalog.json
                  </code>{" "}
                  describing what it can do.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">The registry</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registries index those manifests and expose a search API so clients can discover
                  agents by capability.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">Federation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registries federate — your agent listed in one is discoverable across the entire
                  ARD network.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <a
                href="https://agenticresourcediscovery.org/spec/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Read the full ARD v0.9 specification →
              </a>
            </p>
          </CardContent>
        </Card>
      </section>

      {/* The problem we solve */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <Server className="h-5 w-5 text-destructive" />
                <h3 className="text-lg font-semibold">The problem</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                The ARD spec says agents should host a manifest file at a well-known URL. But
                most agents don't have a domain, can't keep a web server running 24/7, and have no
                way to appear in any registry's search index.{" "}
                <strong className="text-foreground">An agent no one can find can't be used.</strong>
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-primary">What HermesHub does</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">We are the hosting service for ARD.</strong>{" "}
                Register your agent, tell us where it lives (its endpoint URL), and we:
                host its discovery card, index it for search, health-check it every 15 minutes,
                and make it discoverable by every ARD-compatible client in the federation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works — detailed */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <p className="mt-2 text-center text-muted-foreground">Three steps. No infrastructure required.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">1. Register your agent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sign in, give your agent a name, and provide the URL where it runs. We generate
                an Ed25519 keypair for identity. Then declare what it can do using the Hermes
                Capability Taxonomy — 268 capabilities across 28 domains.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">2. We host & monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your agent card goes live at{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  /.well-known/agent-card/:handle
                </code>
                . We ping your agent's endpoint every 15 minutes — if it's down, it's hidden from
                search. If it's up, it's ranked by capability relevance.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">3. Clients discover you</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Any ARD-compatible client — GitHub Agent Finder, Hugging Face Discover, or any tool
                implementing the spec — searches for agents via{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  POST /search
                </code>
                . Your agent appears in results when its capabilities match the query. The client
                reads your card, gets your endpoint URL, and contacts you directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What an agent card looks like */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2 md:p-10">
            <div>
              <h2 className="text-2xl font-semibold">What we host for you</h2>
              <p className="mt-3 text-muted-foreground">
                When you register, we generate a fully ARD-compliant agent card at our well-known
                endpoint. It includes your identity, capabilities, endpoint URL, and trust
                metadata. Here's what clients see:
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Discovery at a well-known URL
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Health status (online/offline)
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Your endpoint URL for direct contact
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Capability-based search indexing
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Federation across the ARD network
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-2 font-mono text-xs text-muted-foreground">
                GET /.well-known/agent-card/your-agent
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed">
                <code>{`{
  "identifier": "urn:air:hermeshub.xyz:agent:your-bot",
  "displayName": "Your Bot",
  "type": "application/a2a-agent-card+json",
  "capabilities": [
    "hct:code:write:feature",
    "hct:code:test:unit"
  ],
  "representativeQueries": [
    "write a REST API endpoint",
    "generate unit tests"
  ],
  "metadata": {
    "hermes:endpoint": "https://your-agent.com/api",
    "hermes:subscriptionStatus": "active"
  },
  "trustManifest": { ... }
}`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-10">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">$5/month. That's it.</h2>
              <p className="mt-2 text-muted-foreground">
                One price. No tiers. Cancel anytime. Billed via Stripe.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Hosted Listing</span>
                    <span className="text-2xl font-bold">$5<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We host your agent card, run health checks, index for search, and federate
                    across the ARD network. Your agent is discoverable by any ARD-compatible client.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Self-published</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Already have a domain and a server? Host{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      /.well-known/ai-catalog.json
                    </code>{" "}
                    yourself. We'll still index and search you at no cost.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/agents/new">
                <Button size="lg">
                  Host Your Agent
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="https://agenticresourcediscovery.org/spec/" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline">
                  Learn the ARD spec
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Why it matters */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Be discoverable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Without ARD, your agent is invisible. Clients hardcode the agents they know or
                inject descriptions into their context window — neither scales. ARD is how the
                agent economy discovers capability at scale.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Capability-based search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clients describe what they need and filter by capability URIs and tags.
                Agents are matched and ranked by how well their declared capabilities
                align with the query — not keyword matching alone.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Built on Stripe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Subscription billing handled entirely through Stripe. No marketplace fees, no
                transaction cuts. Just $5/month for hosting. Self-publish for free.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
