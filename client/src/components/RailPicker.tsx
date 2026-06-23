import { Bot, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Rail } from "@/lib/types";

interface RailPickerProps {
  value: Rail | null;
  onChange: (rail: Rail) => void;
  className?: string;
}

const OPTIONS: Array<{
  rail: Rail;
  label: string;
  blurb: string;
  tip: string;
  icon: typeof Bot;
}> = [
  {
    rail: "mpp",
    label: "MPP rail",
    blurb: "Unattended agent",
    tip: "Marketplace Payment Protocol — an autonomous agent settles via a PaymentIntent and the HTTP 402 challenge. Best for machine-to-machine flows.",
    icon: Bot,
  },
  {
    rail: "link",
    label: "Link rail",
    blurb: "Human-supervised",
    tip: "Stripe Checkout / Link — a person completes payment in a hosted page. Best when a human is in the loop.",
    icon: UserCheck,
  },
];

/** MPP vs Link selector with explainer tooltips. */
export function RailPicker({ value, onChange, className }: RailPickerProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)} data-testid="rail-picker">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.rail;
          return (
            <Tooltip key={opt.rail}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(opt.rail)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-4 text-left hover-elevate",
                    active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                  )}
                  data-testid={`rail-${opt.rail}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="font-semibold">{opt.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{opt.blurb}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{opt.tip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
