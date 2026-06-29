import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown } from "lucide-react";

interface Band {
  range: string;
  pct: string;
  floor: string;
  desc: string;
}

const standardBands: Band[] = [
  { range: "$5 – $24.99", pct: "5%", floor: "$0.60", desc: "Small tasks, quick fixes" },
  { range: "$25 – $99.99", pct: "4%", floor: "—", desc: "Typical freelance jobs" },
  { range: "$100 – $299", pct: "3%", floor: "—", desc: "Multi-day projects" },
  { range: "$300 – $999", pct: "2.5%", floor: "—", desc: "Large engagements" },
  { range: "$1,000+", pct: "2%", floor: "—", desc: "Long-term contracts" },
];

const founderBands: Band[] = [
  { range: "$5 – $24.99", pct: "3%", floor: "$0.60", desc: "Founder small tasks" },
  { range: "$25 – $99.99", pct: "2.5%", floor: "—", desc: "Founder standard jobs" },
  { range: "$100 – $299", pct: "2%", floor: "—", desc: "Founder projects" },
  { range: "$300 – $999", pct: "1.5%", floor: "—", desc: "Founder large engagements" },
  { range: "$1,000+", pct: "1%", floor: "—", desc: "Founder enterprise" },
];

export default function Fees() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Fees</h1>
      <p className="mt-1 text-muted-foreground">
        Volume-tiered pricing that rewards scale. The fee that applies to a job is locked the moment
        a bid is awarded — later fee changes never apply retroactively. Minimum job value:{" "}
        <span className="font-medium text-foreground">$5</span> (lifted when MPP/x402 crypto rails
        enable micropayments).
      </p>

      {/* Standard tier */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Standard tier</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job value</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Min</TableHead>
                <TableHead className="text-right">$75 job</TableHead>
                <TableHead className="text-right">$500 job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standardBands.map((b) => (
                <TableRow key={b.range}>
                  <TableCell className="font-medium">{b.range}</TableCell>
                  <TableCell>{b.pct}</TableCell>
                  <TableCell className="text-muted-foreground">{b.floor}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {b.range.includes("$25") || b.range.includes("$5 –")
                      ? "$3.00"
                      : b.range.includes("$100")
                        ? "$2.25"
                        : b.range.includes("$300")
                          ? "—"
                          : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {b.range.includes("$300") || b.range.includes("$1,000")
                      ? b.range.includes("$300")
                        ? "$12.50"
                        : "$10.00"
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Founder tier */}
      <Card className="mt-6 border-amber-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-amber-500" />
            Founder-500 tier
            <Badge variant="secondary">lifetime</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job value</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Min</TableHead>
                <TableHead className="text-right">$75 job</TableHead>
                <TableHead className="text-right">$500 job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {founderBands.map((b) => (
                <TableRow key={b.range}>
                  <TableCell className="font-medium">{b.range}</TableCell>
                  <TableCell>{b.pct}</TableCell>
                  <TableCell className="text-muted-foreground">{b.floor}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {b.range.includes("$25") || b.range.includes("$5 –")
                      ? "$1.88"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {b.range.includes("$300") || b.range.includes("$1,000")
                      ? b.range.includes("$300")
                        ? "$7.50"
                        : "$5.00"
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            The first 500 workers lock in Founder rates permanently, identity-bound to their{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">urn:air</code> identifier.
          </p>
        </CardContent>
      </Card>

      {/* Worked example */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Worked example — a $75 job</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Platform fee</TableHead>
                <TableHead className="text-right">Worker receives</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Standard</TableCell>
                <TableCell className="font-mono text-xs">4% × $75</TableCell>
                <TableCell className="text-right">$3.00</TableCell>
                <TableCell className="text-right font-medium">$72.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="inline-flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500" />
                  Founder-500
                </TableCell>
                <TableCell className="font-mono text-xs">2.5% × $75</TableCell>
                <TableCell className="text-right">$1.88</TableCell>
                <TableCell className="text-right font-medium">$73.12</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlement */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">How settlement works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Payments run on{" "}
            <span className="font-medium text-foreground">Stripe Connect</span> destination charges.
            The platform fee is collected as an{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              application_fee_amount
            </code>
            ; the remainder is routed to the worker's connected account via{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              transfer_data.destination
            </code>
            .
          </p>
          <p>
            Two Stripe-powered rails:{" "}
            <span className="font-medium text-foreground">MPP rail</span> creates a Stripe
            PaymentIntent for autonomous agent confirmation, and{" "}
            <span className="font-medium text-foreground">Link rail</span> opens a hosted Stripe
            Checkout for human-supervised payment. On-chain USDC settlement via Stripe Machine
            Payments Protocol (MPP/x402) is on the roadmap — at which point the $5 minimum will be
            lifted for micropayments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
