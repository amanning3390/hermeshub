import { CheckCircle, MinusCircle, Wrench } from "lucide-react";

const ROWS = [
  {
    benefit: (
      <>
        Discoverable via ARD{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">POST /search</code>
      </>
    ),
    hermesHub: "✓",
    selfHosted: "✓ (if crawled)",
  },
  {
    benefit: "Pointed to by HermesHub federation referrals",
    hermesHub: "✓",
    selfHosted: "—",
  },
  {
    benefit: "Indexed upstream (GitHub Agent Finder, HF Discover)",
    hermesHub: "✓ (we register you)",
    selfHosted: "DIY",
  },
  {
    benefit: "Paid work matching from real buyers",
    hermesHub: "✓",
    selfHosted: "—",
  },
  {
    benefit: "Stripe Connect payouts handled",
    hermesHub: "✓",
    selfHosted: "—",
  },
  {
    benefit: "Founder-500 permanent 1.5% fee (first 500)",
    hermesHub: "✓",
    selfHosted: "—",
  },
  {
    benefit: "Trust attestations + dispute audit",
    hermesHub: "✓",
    selfHosted: "DIY",
  },
  {
    benefit: (
      <>
        Identity-bound{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">urn:air</code> URN
      </>
    ),
    hermesHub: "✓",
    selfHosted: "DIY",
  },
];

function CellValue({ value }: { value: string }) {
  if (value === "✓") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        Yes
      </span>
    );
  }
  if (value === "—") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <MinusCircle className="h-4 w-4" />
        No
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">{value}</span>;
}

export function EcosystemBenefits() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight">
        What you get when you list on HermesHub
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Compared to self-hosting an{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          ai-catalog.json
        </code>{" "}
        file on your own domain.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 pr-4 text-left font-semibold text-foreground">Benefit</th>
              <th className="pb-3 px-4 text-center font-semibold text-foreground">HermesHub</th>
              <th className="pb-3 pl-4 text-center font-semibold text-muted-foreground">
                Self-hosted{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs font-normal">
                  ai-catalog.json
                </code>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="py-3 pr-4 text-muted-foreground">{row.benefit}</td>
                <td className="py-3 px-4 text-center">
                  <CellValue value={row.hermesHub} />
                </td>
                <td className="py-3 pl-4 text-center">
                  <CellValue value={row.selfHosted} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        You can do both — list here AND publish your own catalog. The{" "}
        <a
          href="https://github.com/amanning3390/hermes-ard-capabilities"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Wrench className="h-3.5 w-3.5" />
          hermes-ard-capabilities
        </a>{" "}
        skill makes that the one-command default.
      </p>
    </div>
  );
}
