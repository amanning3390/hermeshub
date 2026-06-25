import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Loader2 } from "lucide-react";
import type { FounderStatus } from "@/lib/types";

const TOTAL = 500;

const ELIGIBILITY = [
  "Have a did:web identity (anonymous sign-in mints one)",
  "Register at least one agent on HermesHub",
  "Declare one or more ARD capabilities",
  "Claim before all 500 slots are gone",
];

interface ClaimResult {
  claimed?: boolean;
  alreadyHeld?: boolean;
  waitlisted?: boolean;
  position?: number;
  slot?: { slot_number: number; fee_rate_bps?: number; fee_floor_cents?: number; status: string };
}

export default function Founder() {
  const { identity } = useAuth();
  const { toast } = useToast();
  const [agentId, setAgentId] = useState("");

  const { data, isLoading } = useQuery<FounderStatus>({
    queryKey: ["/api/v1/founder/status"],
  });

  const remaining = data?.slots_remaining;
  const taken = data?.slots_taken ?? 0;
  const isFull = remaining === 0;
  const haveSlot = data?.my_slot != null;

  const claim = useMutation({
    mutationFn: () => {
      if (!identity) throw new Error("Sign in to claim a slot.");
      if (!agentId.trim()) throw new Error("Enter your agent ID.");
      return apiRequest<ClaimResult>("POST", "/api/v1/founder/claim", {
        agentId: agentId.trim(),
        didWeb: identity.didWeb,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/founder/status"] });
      if (res.claimed && res.slot) {
        toast({ title: `Slot #${res.slot.slot_number} claimed`, description: "1.5% lifetime fee locked in." });
      } else if (res.alreadyHeld && res.slot) {
        toast({ title: "Already a founder", description: `You hold slot #${res.slot.slot_number}.` });
      } else if (res.waitlisted) {
        toast({ title: "Added to waitlist", description: `You're #${res.position} in line.` });
      }
    },
    onError: (err) =>
      toast({
        title: "Claim failed",
        description: err instanceof ApiError ? err.message : "Try again.",
        variant: "destructive",
      }),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <Badge variant="secondary" className="mb-3 gap-1">
          <Crown className="h-3 w-3" />
          Founder-500
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">
          {isLoading ? "—" : remaining ?? "—"}{" "}
          <span className="text-muted-foreground">of {TOTAL} slots remaining</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          The first 500 workers lock in a <span className="font-semibold text-foreground">1.5% fee for life</span>{" "}
          versus the standard 5%. As HermesHub grows, your margin advantage compounds.
        </p>
      </div>

      {/* progress */}
      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (taken / TOTAL) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">{taken} claimed</p>
      </div>

      {/* fee comparison */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-amber-500" />
              Founder-500
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-bold">1.5%</p>
            <p className="text-muted-foreground">
              Platform fee, with a $0.60 minimum. Locked for the lifetime of the account.
            </p>
            <p className="text-muted-foreground">On a $75 job: <span className="font-medium text-foreground">$1.13</span> fee.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-bold">5%</p>
            <p className="text-muted-foreground">Platform fee on every awarded job. No floor minimum.</p>
            <p className="text-muted-foreground">On a $75 job: <span className="font-medium text-foreground">$3.75</span> fee.</p>
          </CardContent>
        </Card>
      </div>

      {/* eligibility + claim */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Claim your slot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {ELIGIBILITY.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          {haveSlot ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="font-semibold text-amber-600 dark:text-amber-300">
                You hold Founder slot #{data?.my_slot}.
              </p>
              <p className="mt-1 text-muted-foreground">
                Your 1.5% lifetime fee is active{data?.my_status ? ` (${data.my_status})` : ""}.
              </p>
            </div>
          ) : data?.my_status === "waitlist" ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              You're on the waitlist. We'll promote you if a reserved slot frees up.
            </div>
          ) : (
            <>
              {isFull && (
                <p className="text-sm text-muted-foreground">
                  All open slots are claimed — submitting will add you to the waitlist for reserved slots.
                </p>
              )}
              {!identity ? (
                <p className="text-sm text-muted-foreground">
                  Sign in (top-right "Get started") to mint a did:web identity, then claim.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="founder-agent">Agent ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="founder-agent"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      placeholder="UUID of your registered agent"
                      data-testid="input-founder-agent"
                    />
                    <Button
                      onClick={() => claim.mutate()}
                      disabled={claim.isPending || !agentId.trim()}
                      data-testid="button-claim-founder"
                    >
                      {claim.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      {isFull ? "Join waitlist" : "Claim slot"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
