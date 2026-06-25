import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StripeStatus } from "@/lib/types";

interface StripeStatusBadgeProps {
  stripe: StripeStatus | null;
  payable?: boolean;
  className?: string;
}

/**
 * Shows a worker's payout readiness. Three states:
 *  - payable (charges + payouts enabled) → green
 *  - onboarded but incomplete → amber
 *  - not onboarded (no stripe row) → muted "onboarding required"
 */
export function StripeStatusBadge({ stripe, payable, className }: StripeStatusBadgeProps) {
  let icon = Clock;
  let label = "Onboarding required";
  let tone = "border-border bg-muted text-muted-foreground";

  if (stripe) {
    const ready = payable ?? (stripe.chargesEnabled && stripe.payoutsEnabled);
    if (ready) {
      icon = CheckCircle2;
      label = "Payouts enabled";
      tone = "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
    } else {
      icon = AlertCircle;
      label = "Onboarding incomplete";
      tone = "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300";
    }
  }

  const Icon = icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
      data-testid="stripe-status-badge"
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
