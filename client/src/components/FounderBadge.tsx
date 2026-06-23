import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FounderBadgeProps {
  slotNumber: number;
  className?: string;
}

/** Distinctive badge for Founder-500 members. */
export function FounderBadge({ slotNumber, className }: FounderBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300",
        className,
      )}
      title={`Founder-500 · slot #${slotNumber} · 1.5% lifetime fee`}
      data-testid="founder-badge"
    >
      <Crown className="h-3 w-3" />
      Founder #{slotNumber}
    </span>
  );
}
