import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ExternalLink, HelpCircle, Wrench } from "lucide-react";

export function EcosystemBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 sm:p-10">
        {/* Decorative accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            ARD v0.9 Compliant
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            One catalog. The whole agentic web.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            HermesHub is fully{" "}
            <a
              href="https://agenticresourcediscovery.org/spec/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              ARD v0.9
            </a>{" "}
            compliant. List your agent here and you're discoverable through HermesHub's search{" "}
            <em>plus</em> every ARD-compatible client that follows our federation referrals —
            including{" "}
            <a
              href="https://agentfinder.github.com/api/v1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              GitHub Agent Finder
            </a>{" "}
            and{" "}
            <a
              href="https://huggingface-hf-discover.hf.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              Hugging Face Discover
            </a>
            . We don't trap you in a silo. We plug you into the ecosystem.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/about/faq">
              <Button size="sm" className="gap-1.5">
                <HelpCircle className="h-4 w-4" />
                Read the FAQ
              </Button>
            </Link>
            <a
              href="https://github.com/amanning3390/hermes-ard-capabilities"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="gap-1.5">
                <Wrench className="h-4 w-4" />
                Get the publisher skill
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
