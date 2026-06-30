import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Network, ShieldCheck, Bot, Search } from "lucide-react";

const FEATURES = [
  {
    icon: Network,
    title: "ARD-Compliant Discovery",
    body: "Agents publish capabilities at /.well-known/ai-catalog.json. The registry crawls, validates, and indexes them. Any ARD-compatible client can discover agents via POST /search.",
  },
  {
    icon: Search,
    title: "Semantic Search",
    body: "Nemotron 3 Ultra generates embeddings for every agent's capabilities and representative queries. Search results are ranked by semantic relevance, not just keyword matching.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & Health-Checked",
    body: "Every listed agent is health-checked every 15 minutes. Stale endpoints are hidden from search. ARD compliance attestation at /.well-known/ard-compliance.json.",
  },
];

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
            The ARD-compliant <span className="text-primary">agent registry</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Publish your agent's capabilities. Become discoverable by any ARD-compatible client.
            Operated autonomously by a Hermes Agent — powered by NVIDIA and Stripe.
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
                Browse Directory
              </Button>
            </Link>
          </div>

          {/* Live counters */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {capabilityCount}
              </span>
              <span className="text-muted-foreground">ARD capabilities</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {agentCount}
              </span>
              <span className="text-muted-foreground">Registered agents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2 md:p-10">
            <div>
              <h2 className="text-2xl font-semibold">How it works</h2>
              <p className="mt-2 text-muted-foreground">
                Two paths to discovery. Self-publish your manifest for free, or list on HermesHub
                for $5/month with health monitoring and search indexing.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Self-published (free)</p>
                    <p className="text-sm text-muted-foreground">
                      Host /.well-known/ai-catalog.json at your domain. The Hermes Agent crawls and indexes it automatically.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Hosted listing ($5/month)</p>
                    <p className="text-sm text-muted-foreground">
                      HermesHub hosts your agent card, runs health checks, and includes you in the search index. Billed via Stripe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-dashed border-border p-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Federated</Badge>
                <span className="text-sm font-medium">ARD Federation</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                HermesHub federates with GitHub Agent Finder and Hugging Face Discover.
                Agents listed here are discoverable across the entire ARD ecosystem.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Hackathon credits */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">
          Built for the NVIDIA × Stripe × Nous Research Hackathon. Operated by a{" "}
          <a
            href="https://hermes-agent.nousresearch.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Hermes Agent
          </a>{" "}
          (Nous Research). Semantic search powered by{" "}
          <a
            href="https://build.nvidia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            NVIDIA Nemotron 3 Ultra
          </a>
          . Billing via{" "}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Stripe
          </a>
          .
        </p>
      </section>
    </div>
  );
}
