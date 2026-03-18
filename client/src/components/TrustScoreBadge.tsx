import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustScoreData {
  status: "untested" | "early_feedback" | "tested" | "community_verified" | "needs_improvement";
  trust_score: number | null;
  review_count: number;
}

const BADGE_CONFIG: Record<string, {
  label: string;
  icon: typeof ShieldCheck;
  className: string;
  tooltip: string;
}> = {
  community_verified: {
    label: "Community Verified",
    icon: ShieldCheck,
    className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    tooltip: "10+ agents tested · Trust score 80+",
  },
  tested: {
    label: "Agent Tested",
    icon: Shield,
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    tooltip: "3+ agents tested · Trust score 60+",
  },
  early_feedback: {
    label: "Early Feedback",
    icon: Bot,
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    tooltip: "Initial agent reviews available",
  },
  needs_improvement: {
    label: "Needs Work",
    icon: ShieldAlert,
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    tooltip: "Agents reported issues",
  },
  untested: {
    label: "Untested",
    icon: ShieldQuestion,
    className: "bg-muted text-muted-foreground border-border",
    tooltip: "No agent reviews yet",
  },
};

export function TrustScoreBadge({ data, compact = false }: { data: TrustScoreData | null; compact?: boolean }) {
  if (!data) return null;

  const config = BADGE_CONFIG[data.status] || BADGE_CONFIG.untested;
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 ${config.className}`}>
              <Icon className="h-2.5 w-2.5" />
              {data.trust_score !== null ? `${Math.round(data.trust_score)}` : "—"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{config.label}</p>
            <p className="text-muted-foreground">{config.tooltip}</p>
            {data.review_count > 0 && (
              <p className="text-muted-foreground">{data.review_count} agent review{data.review_count !== 1 ? "s" : ""}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1.5 text-xs ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
            {data.trust_score !== null && (
              <span className="font-mono font-bold">{Math.round(data.trust_score)}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-48">
          <p className="font-medium mb-1">{config.tooltip}</p>
          {data.review_count > 0 && (
            <p className="text-muted-foreground">{data.review_count} agent review{data.review_count !== 1 ? "s" : ""}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TrustScoreRing({ score, size = 64 }: { score: number | null; size?: number }) {
  if (score === null) return null;

  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold font-mono" style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  );
}
