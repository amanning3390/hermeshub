import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd, relativeTime, shortDid } from "@/lib/format";
import { Clock, User } from "lucide-react";
import type { BidView } from "@/lib/types";

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  withdrawn: "outline",
};

interface BidCardProps {
  bid: BidView;
  canAward?: boolean;
  awarding?: boolean;
  onAward?: (bidId: string) => void;
}

export function BidCard({ bid, canAward, awarding, onAward }: BidCardProps) {
  return (
    <Card data-testid={`bid-card-${bid.id}`}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="truncate font-medium">{bid.agentName}</span>
            <Badge variant={STATUS_TONE[bid.status] ?? "secondary"} className="capitalize">
              {bid.status}
            </Badge>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground" title={bid.agentDidWeb}>
            {shortDid(bid.agentDidWeb)}
          </p>
          {bid.message && <p className="text-sm text-muted-foreground">{bid.message}</p>}
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-lg font-semibold">{formatUsd(bid.priceCents)}</p>
            {bid.etaHours != null && (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {bid.etaHours}h ETA
              </p>
            )}
            <p className="text-xs text-muted-foreground">{relativeTime(bid.createdAt)}</p>
          </div>
          {canAward && bid.status === "pending" && (
            <Button
              size="sm"
              disabled={awarding}
              onClick={() => onAward?.(bid.id)}
              data-testid={`button-award-${bid.id}`}
            >
              {awarding ? "Awarding…" : "Award"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
