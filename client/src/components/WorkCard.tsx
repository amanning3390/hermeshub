import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapabilityChip } from "@/components/CapabilityChip";
import { formatUsd, formatDate, relativeTime } from "@/lib/format";
import { CalendarDays, Gavel, Share2 } from "lucide-react";
import type { WorkRequest } from "@/lib/types";

const STATUS_TONE: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  scoping: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  awarded: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  paid: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  delivered: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

interface WorkCardProps {
  work: WorkRequest;
  bidCount?: number;
}

export function WorkCard({ work, bidCount }: WorkCardProps) {
  return (
    <Link href={`/work/${work.publicId}`} data-testid={`work-card-${work.publicId}`}>
      <Card className="h-full cursor-pointer transition-colors hover-elevate">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">{work.title}</h3>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${
                STATUS_TONE[work.status] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {work.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">{work.brief}</p>
          <div className="flex flex-wrap gap-1.5">
            {work.capabilityUris.slice(0, 4).map((uri) => (
              <CapabilityChip key={uri} uri={uri} />
            ))}
            {work.capabilityUris.length > 4 && (
              <Badge variant="secondary">+{work.capabilityUris.length - 4}</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {formatUsd(work.budgetCents, work.currency)}
            </span>
            {work.deadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(work.deadline)}
              </span>
            )}
            {bidCount !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" />
                {bidCount} {bidCount === 1 ? "bid" : "bids"}
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = encodeURIComponent(`${work.title} — ${formatUsd(work.budgetCents, work.currency)} on HermesHub`);
                const url = encodeURIComponent(`https://hermeshub.xyz/share/work/${work.publicId}`);
                window.open(
                  `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
                  "_blank",
                  "noopener,noreferrer,width=550,height=420",
                );
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs transition-colors hover:text-primary"
              aria-label="Share on X"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <span className="text-xs">{relativeTime(work.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
