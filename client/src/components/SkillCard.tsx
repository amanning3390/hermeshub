import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Download, Tag, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TrustScoreBadge } from "./TrustScoreBadge";
import type { Skill } from "@/lib/skills-data";

const categoryColors: Record<string, string> = {
  productivity: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  development: "bg-green-500/15 text-green-600 dark:text-green-400",
  research: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  devops: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  security: "bg-red-500/15 text-red-600 dark:text-red-400",
  data: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  communication: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};

const categoryIcons: Record<string, string> = {
  productivity: "📋",
  development: "💻",
  research: "🔬",
  devops: "⚙️",
  security: "🔒",
  data: "📊",
  communication: "💬",
};

interface SkillCardProps {
  skill: Skill;
  priceUsd?: number | null;
  creatorUsername?: string | null;
  creatorAvatar?: string | null;
  isPremium?: boolean;
}

export function SkillCard({
  skill,
  priceUsd,
  creatorUsername,
  creatorAvatar,
  isPremium = false,
}: SkillCardProps) {
  // Only fetch trust score for free skills (premium skills have their own rating system)
  const { data: trustData } = useQuery({
    queryKey: ["/api/v1/feedback/score", skill.name],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/v1/feedback/score/${skill.name}`);
      return res.json();
    },
    staleTime: 120_000,
    retry: 1,
    enabled: !isPremium,
  });

  // Determine href based on skill type
  const href = isPremium
    ? `/skill/private/${skill.id || skill.name}`
    : `/skill/${skill.name}`;

  return (
    <Link href={href}>
      <div
        className={`group relative border rounded-lg p-5 bg-card transition-all duration-200 cursor-pointer hover:bg-card/80 ${
          isPremium
            ? "border-[#3050FF]/30 hover:border-[#3050FF]/60"
            : "border-border hover:border-primary/40"
        }`}
        data-testid={`card-skill-${skill.name}`}
      >
        {/* Premium glow accent */}
        {isPremium && (
          <div className="absolute inset-0 rounded-lg bg-[#3050FF]/3 pointer-events-none" />
        )}

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">
              {categoryIcons[skill.category] || "📦"}
            </span>
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
              {isPremium && (
                <Lock className="h-3 w-3 text-[#3050FF] flex-shrink-0" />
              )}
              {skill.displayName}
            </h3>
          </div>

          {/* Right badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isPremium && priceUsd != null ? (
              // Premium price badge
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#3050FF] text-white">
                ${priceUsd.toFixed(2)}
              </span>
            ) : (
              // Free skill: trust score + verified badge
              <>
                {trustData && trustData.review_count > 0 && (
                  <TrustScoreBadge data={trustData} compact />
                )}
                {skill.securityStatus === "verified" && (
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {skill.description}
        </p>

        {/* Creator info for premium skills */}
        {isPremium && creatorUsername && (
          <div className="flex items-center gap-1.5 mb-3">
            {creatorAvatar && (
              <img
                src={creatorAvatar}
                alt={creatorUsername}
                className="w-4 h-4 rounded-full border border-border"
              />
            )}
            <span className="text-[11px] text-muted-foreground">
              @{creatorUsername}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`text-[11px] px-2 py-0.5 ${
              categoryColors[skill.category] || ""
            }`}
          >
            {skill.category}
          </Badge>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {isPremium ? (
              // Premium: show sales count
              skill.installCount > 0 && (
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {skill.installCount.toLocaleString()}
                </span>
              )
            ) : (
              // Free: show download count and version
              <>
                {skill.installCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {skill.installCount.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  v{skill.version}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
