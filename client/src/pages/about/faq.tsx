import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ExternalLink, BookOpen, Wrench, ArrowLeft } from "lucide-react";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is HermesHub?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HermesHub is an ARD-compliant agent registry. Agents publish their capabilities via a /.well-known/ai-catalog.json manifest at their own domain. HermesHub crawls, indexes, verifies, and makes those agents discoverable via POST /search. The entire registry is operated autonomously by a Hermes Agent (by Nous Research) — crawling, indexing, health monitoring, registration processing, and billing all run 24/7 without human intervention.",
      },
    },
    {
      "@type": "Question",
      name: "What is ARD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ARD (Agentic Resource Discovery) is an open specification, currently v0.9 Draft, that defines how AI agents publish their capabilities and how clients discover them. It was authored by contributors from Google, Microsoft, and Hugging Face. Working group participants include NVIDIA, AWS, Cisco, Databricks, GitHub, GoDaddy, Salesforce, and Snowflake. The full specification is available at https://agenticresourcediscovery.org/spec/. ARD defines a static manifest format (ai-catalog.json) that publishers host at a well-known URL, and a dynamic registry API (POST /search) that provides live, ranked discovery.",
      },
    },
    {
      "@type": "Question",
      name: "How do I list my agent?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Three paths: A) Self-publish — host a /.well-known/ai-catalog.json manifest at your own domain. This is free and HermesHub crawls it automatically. B) HermesHub-hosted listing — $5/month via Stripe, with health monitoring and search index maintenance included. C) Both — self-publish and also maintain a hosted listing. Use the hermes-ard-capabilities skill to generate a valid manifest: it scaffolds the ai-catalog.json, validates it against the ARD schema, and can publish it to your domain or to HermesHub.",
      },
    },
    {
      "@type": "Question",
      name: "Why $5/month for a hosted listing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The $5/month covers hosting, health monitoring (15-minute checks against your agent endpoint), search index maintenance, and federation with upstream registries (GitHub Agent Finder, Hugging Face Discover). Self-published manifests remain completely free — if you host your own /.well-known/ai-catalog.json, HermesHub crawls and indexes it at no cost. If you stop paying for a hosted listing, the hosted entry deactivates, but any self-hosted manifest at your own domain remains crawlable and discoverable.",
      },
    },
    {
      "@type": "Question",
      name: "How does HermesHub relate to NVIDIA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NVIDIA is a working group participant in the ARD specification and is listed in the acknowledgements at agenticresourcediscovery.org. Within HermesHub's infrastructure, NVIDIA technologies are used operationally: Nemotron 3 Ultra generates the semantic embeddings that power the search ranking engine, and NemoClaw provides sandboxed execution for the crawling pipeline. The ARD standard itself is vendor-neutral — any compliant registry can use any underlying technology.",
      },
    },
    {
      "@type": "Question",
      name: "How does HermesHub relate to Stripe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stripe handles subscription billing for hosted listings. The $5/month recurring charge is processed via Stripe Checkout. The Hermes Agent manages billing autonomously — creating subscriptions, handling webhook events, and deactivating listings when payments lapse. HermesHub itself is never in the path between agents transacting with each other; Stripe is used solely for the hosted listing subscription, not for inter-agent payments.",
      },
    },
    {
      "@type": "Question",
      name: "How does HermesHub relate to Nous Research?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HermesHub is built and operated by a Hermes Agent created by Nous Research. The agent handles crawling, indexing, health monitoring, registration processing, and billing — autonomously, 24/7. There is no human operations team. The Hermes Agent uses Nous Research's infrastructure and models to keep the registry running, crawl new manifests, verify agent endpoints, maintain the search index, and process Stripe subscriptions.",
      },
    },
    {
      "@type": "Question",
      name: "How does the search work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Clients send POST /search with query.text (natural language description) and query.filter (structured constraints like capability URIs or tags). Nemotron 3 Ultra generates semantic embeddings from the query text and from each agent's manifest, enabling vector similarity ranking. Results are scored 0–100 by relevance. When federation mode is enabled, HermesHub also returns referral pointers to GitHub Agent Finder and Hugging Face Discover so clients can query those registries for additional matches.",
      },
    },
    {
      "@type": "Question",
      name: "Which other registries does HermesHub federate with?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HermesHub federates with GitHub Agent Finder (https://agentfinder.github.com/api/v1/) and Hugging Face Discover (https://huggingface-hf-discover.hf.space/). Both are health-checked every 6 hours. If a federated endpoint fails 3 consecutive health checks, it is automatically disabled until it recovers — so clients are never pointed at dead endpoints. Federation means that when a client queries HermesHub with federation: referrals mode, the response includes pointers to these registries for the client to query directly.",
      },
    },
    {
      "@type": "Question",
      name: "Is HermesHub ARD-compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. HermesHub publishes a compliance attestation at /.well-known/ard-compliance.json. It implements: the well-known ai-catalog.json manifest, POST /search with query.text and query.filter, POST /explore, federation modes (none and referrals), A2A-compliant agent cards at /.well-known/agent-card/<handle>, trust manifests with identity and attestations, and the standard error envelope { error: { code, message } } with all five standard error codes (INVALID_ARGUMENT, UNAUTHENTICATED, NOT_FOUND, RATE_LIMIT_EXCEEDED, INTERNAL_ERROR).",
      },
    },
    {
      "@type": "Question",
      name: "What happens if my agent goes offline?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HermesHub health-checks every listed agent endpoint every 15 minutes. After 2 consecutive failures, the agent is marked 'stale' and hidden from search results. When the endpoint comes back online and returns a successful response, the agent is automatically reactivated and re-indexed. Your subscription status and urn:air URN are preserved during downtime — nothing is lost. If you have a hosted listing, the subscription continues to run; if you are self-published, your manifest is simply re-crawled on recovery.",
      },
    },
    {
      "@type": "Question",
      name: "Can I run my own ARD registry?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The HermesHub codebase is a working reference implementation of an ARD-compliant registry. The ARD spec mandates POST /search (required), GET /.well-known/ai-catalog.json (required), and optionally POST /explore and GET /agents. You can deploy your own registry at any HTTPS origin and it will be fully compliant. Federation means both your registry and HermesHub can discover each other's agents — when a client queries either with federation: referrals, they get pointers to the other registry for additional results.",
      },
    },
  ],
};

const QA_ITEMS = [
  {
    id: "q1",
    question: "What is HermesHub?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          HermesHub is an{" "}
          <strong className="text-foreground">ARD-compliant agent registry</strong>.
          Agents publish their capabilities via a{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            /.well-known/ai-catalog.json
          </code>{" "}
          manifest at their own domain. HermesHub crawls, indexes, verifies, and
          makes those agents discoverable via{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            POST /search
          </code>
          .
        </p>
        <p>
          The entire registry is{" "}
          <strong className="text-foreground">operated autonomously</strong> by a
          Hermes Agent (by Nous Research) — crawling, indexing, health
          monitoring, registration processing, and billing all run 24/7 without
          human intervention.
        </p>
      </div>
    ),
  },
  {
    id: "q2",
    question: "What is ARD?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">ARD</strong> (Agentic Resource
          Discovery) is an open specification, currently{" "}
          <strong className="text-foreground">v0.9 Draft</strong>, that defines
          how AI agents publish their capabilities and how clients discover them.
          It was authored by contributors from{" "}
          <strong className="text-foreground">Google</strong>,{" "}
          <strong className="text-foreground">Microsoft</strong>, and{" "}
          <strong className="text-foreground">Hugging Face</strong>.
        </p>
        <p>
          Working group participants include{" "}
          <strong className="text-foreground">NVIDIA</strong>, AWS, Cisco,
          Databricks, GitHub, GoDaddy, Salesforce, and Snowflake.
        </p>
        <p>
          The full specification is available at{" "}
          <a
            href="https://agenticresourcediscovery.org/spec/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            agenticresourcediscovery.org/spec/
          </a>
          . ARD defines a static manifest format (
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            ai-catalog.json
          </code>
          ) that publishers host at a well-known URL, and a dynamic registry API
          at{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            POST /search
          </code>{" "}
          that provides live, ranked discovery.
        </p>
      </div>
    ),
  },
  {
    id: "q3",
    question: "How do I list my agent?",
    answer: (
      <div className="space-y-4 text-muted-foreground">
        <p>Three paths:</p>
        <div className="space-y-4">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
            <p className="font-medium text-foreground">
              A — Self-publish{" "}
              <span className="ml-1 text-xs text-primary">(free)</span>
            </p>
            <p className="mt-1 text-sm">
              Host a{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                /.well-known/ai-catalog.json
              </code>{" "}
              manifest at your own domain. HermesHub crawls it automatically — no
              signup, no payment, no account required.
            </p>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="font-medium text-foreground">
              B — HermesHub-hosted listing{" "}
              <span className="ml-1 text-xs text-primary">($5/month via Stripe)</span>
            </p>
            <p className="mt-1 text-sm">
              HermesHub hosts your agent card, provides health monitoring
              (15-minute checks), maintains your entry in the search index, and
              federates it to upstream registries.
            </p>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="font-medium text-foreground">C — Both</p>
            <p className="mt-1 text-sm">
              Self-publish at your domain <em>and</em> maintain a hosted listing
              for maximum discoverability.
            </p>
          </div>
        </div>
        <p>
          Use the{" "}
          <a
            href="https://github.com/amanning3390/hermes-ard-capabilities"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            hermes-ard-capabilities
          </a>{" "}
          skill to generate a valid manifest — it scaffolds the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            ai-catalog.json
          </code>
          , validates it against the ARD schema, and can publish it to your
          domain or to HermesHub.
        </p>
      </div>
    ),
  },
  {
    id: "q4",
    question: "Why $5/month for a hosted listing?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          The <strong className="text-foreground">$5/month</strong> covers:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm">
          <li>Hosting your agent card and catalog entry</li>
          <li>Health monitoring (15-minute checks against your agent endpoint)</li>
          <li>Search index maintenance</li>
          <li>Federation with upstream registries (GitHub Agent Finder, Hugging Face Discover)</li>
        </ul>
        <p>
          <strong className="text-foreground">Self-published manifests remain
          completely free</strong> — if you host your own{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            /.well-known/ai-catalog.json
          </code>
          , HermesHub crawls and indexes it at no cost.
        </p>
        <p>
          If you stop paying for a hosted listing, the hosted entry deactivates,
          but any self-hosted manifest at your own domain{" "}
          <strong className="text-foreground">stays crawlable</strong> and
          discoverable.
        </p>
      </div>
    ),
  },
  {
    id: "q5",
    question: "How does HermesHub relate to NVIDIA?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">NVIDIA</strong> is a working group
          participant in the ARD specification and is listed in the
          acknowledgements at{" "}
          <a
            href="https://agenticresourcediscovery.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            agenticresourcediscovery.org
          </a>
          .
        </p>
        <p>Within HermesHub's infrastructure, NVIDIA technologies are used operationally:</p>
        <ul className="ml-4 list-disc space-y-2 text-sm">
          <li>
            <span className="font-medium text-foreground">Nemotron 3 Ultra</span>{" "}
            — generates the semantic embeddings that power the search ranking
            engine. Query text and agent manifests are embedded for vector
            similarity scoring.
          </li>
          <li>
            <span className="font-medium text-foreground">NemoClaw</span> —
            provides sandboxed execution for the crawling pipeline, allowing
            safe retrieval and parsing of remote agent manifests.
          </li>
        </ul>
        <p>
          The ARD standard itself is{" "}
          <strong className="text-foreground">vendor-neutral</strong> — any
          compliant registry can use any underlying technology stack.
        </p>
      </div>
    ),
  },
  {
    id: "q6",
    question: "How does HermesHub relate to Stripe?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">Stripe</strong> handles subscription
          billing for hosted listings. The $5/month recurring charge is processed
          via{" "}
          <strong className="text-foreground">Stripe Checkout</strong>.
        </p>
        <p>
          The Hermes Agent manages billing autonomously — creating subscriptions,
          handling webhook events, and deactivating listings when payments lapse.
        </p>
        <p>
          <strong className="text-foreground">HermesHub is never in the path</strong>{" "}
          between agents transacting with each other. Stripe is used solely for
          the hosted listing subscription, not for inter-agent payments.
        </p>
      </div>
    ),
  },
  {
    id: "q7",
    question: "How does HermesHub relate to Nous Research?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          HermesHub is built and operated by a{" "}
          <strong className="text-foreground">Hermes Agent created by Nous
          Research</strong>. The agent handles:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm">
          <li>Crawling — discovering and fetching agent manifests across the web</li>
          <li>Indexing — parsing manifests and maintaining the search index</li>
          <li>Health monitoring — checking agent endpoints every 15 minutes</li>
          <li>Registration processing — onboarding new agents and hosted listings</li>
          <li>Billing — managing Stripe subscriptions and webhook events</li>
        </ul>
        <p>
          All of this runs{" "}
          <strong className="text-foreground">autonomously, 24/7</strong>. There
          is no human operations team. The Hermes Agent uses Nous Research's
          infrastructure and models to keep the registry running.
        </p>
      </div>
    ),
  },
  {
    id: "q8",
    question: "How does the search work?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          Clients send{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            POST /search
          </code>{" "}
          with:
        </p>
        <ul className="ml-4 list-disc space-y-2 text-sm">
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              query.text
            </code>{" "}
            — natural language description of what the client needs
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              query.filter
            </code>{" "}
            — structured constraints (capability URIs, tags, type filters)
          </li>
        </ul>
        <p>
          <strong className="text-foreground">Nemotron 3 Ultra</strong> generates
          semantic embeddings from the query text and from each agent's manifest,
          enabling vector similarity ranking. Results are scored{" "}
          <strong className="text-foreground">0–100</strong> by relevance.
        </p>
        <p>
          When federation mode is enabled, HermesHub also returns{" "}
          <strong className="text-foreground">federation referrals</strong> to
          GitHub Agent Finder and Hugging Face Discover so clients can query
          those registries for additional matches.
        </p>
      </div>
    ),
  },
  {
    id: "q9",
    question: "Which other registries does HermesHub federate with?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>HermesHub federates with two registries:</p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <a
              href="https://agentfinder.github.com/api/v1/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              GitHub Agent Finder
            </a>{" "}
            — GitHub's curated catalog covering MCP servers, skills, tools, and
            agents.
          </li>
          <li>
            <a
              href="https://huggingface-hf-discover.hf.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Hugging Face Discover
            </a>{" "}
            — Hugging Face's ARD registry covering thousands of Skills, MCP
            Servers, and Spaces on the Hub.
          </li>
        </ul>
        <p>
          Both are{" "}
          <strong className="text-foreground">health-checked every 6 hours</strong>.
          If a federated endpoint fails{" "}
          <strong className="text-foreground">3 consecutive</strong> health
          checks, it is automatically disabled until it recovers — so clients are
          never pointed at dead endpoints.
        </p>
      </div>
    ),
  },
  {
    id: "q10",
    question: "Is HermesHub ARD-compliant?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">Yes.</strong> Compliance attestation
          is published at{" "}
          <a
            href="/.well-known/ard-compliance.json"
            className="text-primary hover:underline"
          >
            /.well-known/ard-compliance.json
          </a>
          .
        </p>
        <p>HermesHub implements:</p>
        <ul className="ml-4 list-disc space-y-1 text-sm">
          <li>
            Well-known{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              ai-catalog.json
            </code>{" "}
            ✓
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              POST /search
            </code>{" "}
            with{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              query.text
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              query.filter
            </code>{" "}
            ✓
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              POST /explore
            </code>{" "}
            ✓
          </li>
          <li>Federation modes (none, referrals) ✓</li>
          <li>
            A2A-compliant agent cards at{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              /.well-known/agent-card/&lt;handle&gt;
            </code>{" "}
            ✓
          </li>
          <li>Trust manifests with identity, identityType, attestations ✓</li>
          <li>
            Standard error codes:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              INVALID_ARGUMENT
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              UNAUTHENTICATED
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              NOT_FOUND
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              RATE_LIMIT_EXCEEDED
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              INTERNAL_ERROR
            </code>{" "}
            ✓
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "q11",
    question: "What happens if my agent goes offline?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          HermesHub health-checks every listed agent endpoint{" "}
          <strong className="text-foreground">every 15 minutes</strong>.
        </p>
        <ul className="ml-4 list-disc space-y-2 text-sm">
          <li>
            After <strong className="text-foreground">2 consecutive failures</strong>,
            the agent is marked{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              stale
            </code>{" "}
            and hidden from search results.
          </li>
          <li>
            When the endpoint comes back online and returns a successful
            response, the agent is{" "}
            <strong className="text-foreground">automatically reactivated</strong>{" "}
            and re-indexed.
          </li>
          <li>
            Your subscription status and{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              urn:air
            </code>{" "}
            URN are <strong className="text-foreground">preserved</strong> during
            downtime — nothing is lost.
          </li>
        </ul>
        <p>
          If you have a hosted listing, the subscription continues to run; if you
          are self-published, your manifest is simply re-crawled on recovery.
        </p>
      </div>
    ),
  },
  {
    id: "q12",
    question: "Can I run my own ARD registry?",
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">Yes.</strong> The HermesHub codebase
          is a working reference implementation of an ARD-compliant registry.
        </p>
        <p>The ARD spec mandates these endpoints at any HTTPS origin:</p>
        <ul className="ml-4 list-disc space-y-2 text-sm">
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              POST /search
            </code>{" "}
            <span className="text-xs text-primary">(required)</span> — returns
            ranked catalog entries matching a query + filter.
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              GET /.well-known/ai-catalog.json
            </code>{" "}
            <span className="text-xs text-primary">(required)</span> — describes
            your registry as a catalog entry.
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              POST /explore
            </code>{" "}
            <span className="text-xs">(optional)</span> — returns facet buckets
            for browsing.
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              GET /agents
            </code>{" "}
            <span className="text-xs">(optional)</span> — deterministic paginated
            listing.
          </li>
        </ul>
        <p>
          <strong className="text-foreground">Federation</strong> means both your
          registry and HermesHub can discover each other's agents — when a client
          queries either with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            federation: referrals
          </code>
          , they get pointers to the other registry for additional results.
        </p>
      </div>
    ),
  },
];

export default function FAQ() {
  return (
    <>
      {/* JSON-LD FAQPage schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Help &amp; Docs
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            HermesHub, ARD, and the agent registry.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="w-full">
          {QA_ITEMS.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Footer links */}
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <a
              href="https://agenticresourcediscovery.org/spec/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              Read the full ARD spec
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
            <a
              href="https://github.com/amanning3390/hermes-ard-capabilities"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <Wrench className="h-4 w-4 text-primary" />
              Get the publisher skill
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>
          <Link href="/search">
            <span className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
