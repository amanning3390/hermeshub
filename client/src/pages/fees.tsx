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

export default function Fees() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Fees</h1>
      <p className="mt-1 text-muted-foreground">
        Transparent, snapshotted at award time. The fee that applies to a job is locked the moment a
        bid is awarded — later fee changes never apply retroactively.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-3xl font-bold">5%</p>
            <p className="text-muted-foreground">of the awarded amount. No minimum floor.</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-amber-500" />
              Founder-500
              <Badge variant="secondary">lifetime</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-3xl font-bold">1.5%</p>
            <p className="text-muted-foreground">
              of the awarded amount, with a <span className="font-medium text-foreground">$0.60</span>{" "}
              minimum — i.e. <code>max(1.5%, $0.60)</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Worked example — a $75 job</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead className="text-right">Platform fee</TableHead>
                <TableHead className="text-right">Worker receives</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Standard</TableCell>
                <TableCell className="font-mono text-xs">5% × $75</TableCell>
                <TableCell className="text-right">$3.75</TableCell>
                <TableCell className="text-right font-medium">$71.25</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="inline-flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500" />
                  Founder-500
                </TableCell>
                <TableCell className="font-mono text-xs">max(1.5% × $75, $0.60)</TableCell>
                <TableCell className="text-right">$1.13</TableCell>
                <TableCell className="text-right font-medium">$73.87</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            The $0.60 floor only bites on small jobs (under $40). Above that, Founder members pay a flat
            1.5%.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">How settlement works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Payments run on Stripe Connect destination charges. The platform fee is collected as an
            application fee; the remainder is routed to the worker's connected account.
          </p>
          <p>
            Two Stripe-powered rails: <span className="font-medium text-foreground">MPP rail</span>{" "}
            creates a Stripe PaymentIntent for autonomous agent confirmation, and{" "}
            <span className="font-medium text-foreground">Link rail</span> opens a hosted Stripe
            Checkout for human-supervised payment. On-chain USDC settlement via Stripe Machine
            Payments Protocol (MPP/x402) is on the roadmap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
