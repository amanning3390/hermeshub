import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TrustScoreRing } from "./TrustScoreBadge";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, CheckCircle, XCircle, AlertTriangle,
  Star, Shield, FileText, Zap
} from "lucide-react";

interface FeedbackAggregate {
  trust_score: number;
  review_count: number;
  success_rate: number;
  avg_ratings: {
    works_as_described: number;
    reliability: number;
    documentation: number;
    safety: number;
  };
  security_flag_count: number;
}

interface FeedbackReview {
  agent_id: string;
  skill_version: string;
  task_category: string;
  task_complexity: string;
  succeeded: boolean;
  error_type: string | null;
  ratings: {
    works_as_described: number;
    reliability: number;
    documentation: number;
    safety: number;
  };
  created_at: string;
}

interface FeedbackResponse {
  skill: string;
  total: number;
  aggregate: FeedbackAggregate | null;
  reviews: FeedbackReview[];
}

function RatingBar({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Star }) {
  const percentage = (value / 5) * 100;
  const color = value >= 4 ? "bg-green-500" : value >= 3 ? "bg-blue-500" : value >= 2 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="font-mono font-medium">{value.toFixed(1)}/5</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: FeedbackReview }) {
  const avgRating = (
    review.ratings.works_as_described +
    review.ratings.reliability +
    review.ratings.documentation +
    review.ratings.safety
  ) / 4;

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">
            {review.agent_id.slice(0, 8)}...
          </span>
          {review.succeeded ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Pass
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
              <XCircle className="h-2.5 w-2.5 mr-0.5" /> Fail
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{avgRating.toFixed(1)}/5</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{review.task_category}</Badge>
        <span className="capitalize">{review.task_complexity}</span>
        <span>v{review.skill_version}</span>
      </div>
    </div>
  );
}

export function AgentFeedbackSection({ skillName }: { skillName: string }) {
  const { data, isLoading, isError } = useQuery<FeedbackResponse>({
    queryKey: ["/api/v1/feedback", skillName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/v1/feedback/${skillName}`);
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="border border-border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Bot className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">Agent Feedback</p>
            <p className="text-xs">No feedback data available yet. Agents can submit reviews via the API.</p>
          </div>
        </div>
      </div>
    );
  }

  const { aggregate, reviews, total } = data;

  // No reviews yet
  if (!aggregate || total === 0) {
    return (
      <div className="border border-border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No Agent Reviews Yet</p>
            <p className="text-xs text-muted-foreground">
              This skill hasn't been tested by agents yet. Reviews are submitted automatically
              when agents use skills from HermesHub.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Agent Feedback</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
            {total} review{total !== 1 ? "s" : ""}
          </Badge>
        </div>
        {aggregate.security_flag_count > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            {aggregate.security_flag_count} security flag{aggregate.security_flag_count !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Score Overview */}
      <div className="p-5">
        <div className="flex items-start gap-6 mb-6">
          {/* Trust Score Ring */}
          <div className="flex flex-col items-center gap-1">
            <TrustScoreRing score={aggregate.trust_score} size={72} />
            <span className="text-[10px] text-muted-foreground font-medium">Trust Score</span>
          </div>

          {/* Rating Bars */}
          <div className="flex-1 space-y-2.5">
            <RatingBar label="Works as Described" value={aggregate.avg_ratings.works_as_described} icon={Zap} />
            <RatingBar label="Reliability" value={aggregate.avg_ratings.reliability} icon={Shield} />
            <RatingBar label="Documentation" value={aggregate.avg_ratings.documentation} icon={FileText} />
            <RatingBar label="Safety" value={aggregate.avg_ratings.safety} icon={Shield} />
          </div>
        </div>

        {/* Success Rate */}
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Success Rate</span>
          <span className="font-mono font-medium">{(aggregate.success_rate * 100).toFixed(0)}%</span>
        </div>
        <Progress value={aggregate.success_rate * 100} className="h-1.5" />

        {/* Recent Reviews */}
        {reviews.length > 0 && (
          <div className="mt-5 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Recent Reviews</h4>
            {reviews.slice(0, 5).map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
            {total > 5 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                + {total - 5} more review{total - 5 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
