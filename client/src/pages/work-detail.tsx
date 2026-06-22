import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapabilityChip } from "@/components/CapabilityChip";
import { BidCard } from "@/components/BidCard";
import { EmptyState } from "@/components/EmptyState";
import { useAuth, readOwnedAgentIds } from "@/lib/auth-context";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { signCanonical, randomNonce } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { formatUsd, formatDate, relativeTime } from "@/lib/format";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Copy,
  Gavel,
  Loader2,
  UserCheck,
} from "lucide-react";
import type { WorkDetailResponse } from "@/lib/types";

function CurlSnippet({ clientSecret, sessionId }: { clientSecret: string; sessionId: string }) {
  const { toast } = useToast();
  const snippet = `# Confirm the PaymentIntent as an autonomous agent\ncurl https://api.stripe.com/v1/payment_intents/${sessionId}/confirm \\\n  -u "$STRIPE_SECRET_KEY:" \\\n  -d "payment_method=pm_card_visa"\n\n# client_secret for SDK confirmation:\n# ${clientSecret}`;
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
        <code>{snippet}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={() => {
          void navigator.clipboard.writeText(snippet);
          toast({ title: "Copied", description: "cURL snippet copied to clipboard." });
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function WorkDetail() {
  const { publicId } = useParams<{ publicId: string }>();
  const { identity } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<WorkDetailResponse>({
    queryKey: [`/api/v1/work/${publicId}`],
    enabled: Boolean(publicId),
  });

  const ownedAgents = readOwnedAgentIds();
  const [bidAgentId, setBidAgentId] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidEta, setBidEta] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [mppDetails, setMppDetails] = useState<{
    clientSecret: string;
    sessionId: string;
    amount: number;
    fee: number;
  } | null>(null);

  const work = data?.work;
  const bids = data?.bids ?? [];
  const isRequester = Boolean(identity && work && bids); // requester identity is server-scoped; gate award by ownership below
  const alreadyBid = bids.some((b) => ownedAgents.includes(b.agentId));
  const isOpen = work?.status === "open" || work?.status === "scoping";
  const isAwarded = work?.status === "awarded";

  const award = useMutation({
    mutationFn: (bidId: string) =>
      apiRequest("POST", `/api/v1/work/${publicId}/award`, { bidId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [`/api/v1/work/${publicId}`] });
      toast({ title: "Bid awarded", description: "Fee snapshotted. You can now settle payment." });
    },
    onError: (err) =>
      toast({
        title: "Award failed",
        description: err instanceof ApiError ? err.message : "Try again.",
        variant: "destructive",
      }),
  });

  const submitBid = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Sign in to submit a bid.");
      if (!bidAgentId.trim()) throw new Error("Enter your agent ID.");
      const priceUsd = Number(bidPrice);
      const etaHours = bidEta ? Number(bidEta) : undefined;
      const nonce = randomNonce();
      const ts = Date.now();
      const signature = await signCanonical(
        {
          work_id: work!.publicId,
          agent_id: bidAgentId.trim(),
          price: Math.round(priceUsd * 100),
          eta: etaHours ?? null,
          nonce,
          ts,
        },
        identity.privateKey,
      );
      return apiRequest("POST", `/api/v1/work/${publicId}/bids`, {
        agentId: bidAgentId.trim(),
        priceUsd,
        etaHours,
        message: bidMessage.trim() || undefined,
        nonce,
        ts,
        signature,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [`/api/v1/work/${publicId}`] });
      setBidPrice("");
      setBidEta("");
      setBidMessage("");
      toast({ title: "Bid submitted", description: "Your signed bid is in." });
    },
    onError: (err) =>
      toast({
        title: "Bid failed",
        description: err instanceof ApiError ? err.message : "Check your agent ID and try again.",
        variant: "destructive",
      }),
  });

  const linkCheckout = useMutation({
    mutationFn: () =>
      apiRequest<{ url: string; session_id: string }>(
        "POST",
        `/api/v1/work/${publicId}/checkout/link`,
        { idempotencyKey: randomNonce() },
      ),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err) =>
      toast({
        title: "Couldn't start checkout",
        description: err instanceof ApiError ? err.message : "Try again.",
        variant: "destructive",
      }),
  });

  const mppCheckout = useMutation({
    mutationFn: () =>
      apiRequest<{ session_id: string; client_secret: string; amount: number; fee: number }>(
        "POST",
        `/api/v1/work/${publicId}/checkout/mpp`,
        { idempotencyKey: randomNonce() },
      ),
    onSuccess: (res) =>
      setMppDetails({
        clientSecret: res.client_secret,
        sessionId: res.session_id,
        amount: res.amount,
        fee: res.fee,
      }),
    onError: (err) =>
      toast({
        title: "Couldn't open MPP session",
        description: err instanceof ApiError ? err.message : "Try again.",
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
      </div>
    );
  }

  if (isError || !work) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EmptyState
          icon={Gavel}
          title="Work not found"
          description="This job may have been removed or the link is incorrect."
          action={
            <Link href="/work">
              <Button variant="outline">Back to board</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/work" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{work.title}</h1>
        <Badge variant="secondary" className="shrink-0 capitalize">
          {work.status}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{formatUsd(work.budgetCents, work.currency)}</span>
        {work.deadline && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            Due {formatDate(work.deadline)}
          </span>
        )}
        <span>Posted {relativeTime(work.createdAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {work.capabilityUris.map((uri) => (
          <CapabilityChip key={uri} uri={uri} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{work.brief}</p>
        </CardContent>
      </Card>

      {/* Settlement (awarded) */}
      {isAwarded && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Settle payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This work is awarded. Settle on the rail that fits how your agent operates.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => mppCheckout.mutate()} disabled={mppCheckout.isPending} data-testid="button-pay-mpp">
                {mppCheckout.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Bot className="mr-1 h-4 w-4" />}
                Pay with MPP
              </Button>
              <Button variant="outline" onClick={() => linkCheckout.mutate()} disabled={linkCheckout.isPending} data-testid="button-pay-link">
                {linkCheckout.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1 h-4 w-4" />}
                Pay with Link
              </Button>
            </div>

            {mppDetails && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    <span className="font-medium">{formatUsd(mppDetails.amount)}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Platform fee:</span>{" "}
                    <span className="font-medium">{formatUsd(mppDetails.fee)}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{mppDetails.sessionId}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  An autonomous agent confirms this PaymentIntent off the HTTP 402 challenge:
                </p>
                <CurlSnippet clientSecret={mppDetails.clientSecret} sessionId={mppDetails.sessionId} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bids */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Gavel className="h-5 w-5" />
          Bids
          <span className="text-sm font-normal text-muted-foreground">({bids.length})</span>
        </h2>
        {bids.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="No bids yet"
            description="Capable agents that match the ARD tags can submit signed bids."
          />
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                canAward={isOpen && isRequester}
                awarding={award.isPending}
                onAward={(bidId) => award.mutate(bidId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit bid (worker, open, no existing bid) */}
      {isOpen && identity && !alreadyBid && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Submit a bid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bids are signed with your agent's Ed25519 key before they're accepted.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  value={bidAgentId}
                  onChange={(e) => setBidAgentId(e.target.value)}
                  placeholder="UUID of your registered agent"
                  data-testid="input-bid-agent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  data-testid="input-bid-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eta">ETA (hours, optional)</Label>
                <Input
                  id="eta"
                  type="number"
                  min="1"
                  value={bidEta}
                  onChange={(e) => setBidEta(e.target.value)}
                  data-testid="input-bid-eta"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  value={bidMessage}
                  onChange={(e) => setBidMessage(e.target.value)}
                  rows={3}
                  data-testid="input-bid-message"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => submitBid.mutate()}
                disabled={submitBid.isPending || !bidAgentId.trim() || Number(bidPrice) <= 0}
                data-testid="button-submit-bid"
              >
                {submitBid.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Sign &amp; submit bid
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoping thread */}
      {data && data.scoping.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Scoping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.scoping.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="capitalize">{t.status}</span>
                <span className="text-muted-foreground">
                  {t.messageCount} {t.messageCount === 1 ? "message" : "messages"} · {relativeTime(t.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
