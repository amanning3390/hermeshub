import { useParams, Link } from "wouter";
import { Search, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkillCard } from "@/components/SkillCard";
import { getSkills } from "@/lib/skills-data";
import type { Skill } from "@/lib/skills-data";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PremiumSkill {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  category: string;
  price_usd: number;
  creator_username: string;
  creator_avatar: string | null;
  total_sales: number;
  accepted_protocols: string[];
  created_at: string;
}

type TypeFilter = "all" | "free" | "premium";
type SortOption = "newest" | "price-asc" | "price-desc" | "popular";

// ─── Unified card shape ───────────────────────────────────────────────────────

interface UnifiedSkill {
  // Free skill fields (may be undefined for premium)
  freeSkill?: Skill;
  // Premium skill fields (may be undefined for free)
  premiumSkill?: PremiumSkill;
  // Common display fields
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isPremium: boolean;
  priceUsd: number | null;
  creatorUsername: string | null;
  creatorAvatar: string | null;
  installCount: number;
  createdAt: string;
}

function freeToUnified(s: Skill): UnifiedSkill {
  return {
    freeSkill: s,
    id: String(s.id),
    name: s.name,
    displayName: s.displayName,
    description: s.description,
    category: s.category,
    isPremium: false,
    priceUsd: null,
    creatorUsername: null,
    creatorAvatar: null,
    installCount: s.installCount,
    createdAt: "2024-01-01T00:00:00Z",
  };
}

function premiumToUnified(p: PremiumSkill): UnifiedSkill {
  return {
    premiumSkill: p,
    id: p.id,
    name: p.slug || p.name,
    displayName: p.name,
    description: p.short_description,
    category: p.category,
    isPremium: true,
    priceUsd: p.price_usd,
    creatorUsername: p.creator_username,
    creatorAvatar: p.creator_avatar,
    installCount: p.total_sales,
    createdAt: p.created_at,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const categories = [
  { name: "all", label: "All", icon: "📦" },
  { name: "development", label: "Development", icon: "💻" },
  { name: "productivity", label: "Productivity", icon: "📋" },
  { name: "research", label: "Research", icon: "🔬" },
  { name: "devops", label: "DevOps", icon: "⚙️" },
  { name: "security", label: "Security", icon: "🔒" },
  { name: "data", label: "Data", icon: "📊" },
  { name: "communication", label: "Communication", icon: "💬" },
];

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const params = useParams<{ category?: string }>();
  const activeCategory = params.category || "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Free skills from local data
  const freeSkills = getSkills();

  // Premium skills from API
  const { data: premiumSkillsRaw = [] } = useQuery<PremiumSkill[]>({
    queryKey: ["/api/v1/skills/marketplace"],
    queryFn: async () => {
      const res = await fetch("/api/v1/skills/marketplace");
      if (!res.ok) throw new Error("Failed to fetch marketplace skills");
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Merge into unified list
  const allUnified = useMemo<UnifiedSkill[]>(() => {
    const free = freeSkills.map(freeToUnified);
    const premium = premiumSkillsRaw.map(premiumToUnified);
    return [...free, ...premium];
  }, [freeSkills, premiumSkillsRaw]);

  // Category counts (across all types)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allUnified.forEach((s) => {
      counts[s.category] = (counts[s.category] ?? 0) + 1;
    });
    counts["all"] = allUnified.length;
    return counts;
  }, [allUnified]);

  const filtered = useMemo<UnifiedSkill[]>(() => {
    let result = allUnified;

    // Type filter
    if (typeFilter === "free") result = result.filter((s) => !s.isPremium);
    if (typeFilter === "premium") result = result.filter((s) => s.isPremium);

    // Category filter
    if (activeCategory !== "all") {
      result = result.filter((s) => s.category === activeCategory);
    }

    // Search
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.freeSkill?.tags &&
            s.freeSkill.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case "price-asc":
          return (a.priceUsd ?? 0) - (b.priceUsd ?? 0);
        case "price-desc":
          return (b.priceUsd ?? 0) - (a.priceUsd ?? 0);
        case "popular":
          return b.installCount - a.installCount;
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return result;
  }, [allUnified, typeFilter, activeCategory, searchQuery, sortOption]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Browse Skills</h1>
        <p className="text-sm text-muted-foreground">
          {allUnified.length} skills for Hermes Agent
        </p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search skills..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-browse-search"
          />
        </div>
        <Select
          value={sortOption}
          onValueChange={(v) => setSortOption(v as SortOption)}
        >
          <SelectTrigger className="bg-card w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-4">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === tab.value
                ? "bg-[#3050FF] text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid={`filter-type-${tab.value}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.name;
          const count = categoryCounts[cat.name] ?? 0;
          return (
            <Link
              key={cat.name}
              href={cat.name === "all" ? "/browse" : `/browse/${cat.name}`}
            >
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={`cursor-pointer text-xs px-3 py-1.5 gap-1.5 transition-colors ${
                  isActive ? "" : "hover:bg-muted"
                }`}
                data-testid={`badge-category-${cat.name}`}
              >
                <span>{cat.icon}</span>
                {cat.label}
                <span className="opacity-60">({count})</span>
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Filter className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No skills found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((unified) =>
            unified.freeSkill ? (
              <SkillCard
                key={`free-${unified.id}`}
                skill={unified.freeSkill}
                isPremium={false}
              />
            ) : unified.premiumSkill ? (
              <SkillCard
                key={`premium-${unified.id}`}
                skill={{
                  id: Number(unified.id) || 0,
                  name: unified.premiumSkill.slug || unified.premiumSkill.name,
                  displayName: unified.premiumSkill.name,
                  description: unified.premiumSkill.short_description,
                  category: unified.premiumSkill.category,
                  author: unified.premiumSkill.creator_username,
                  version: "1.0.0",
                  license: null,
                  compatibility: null,
                  tags: null,
                  installCount: unified.premiumSkill.total_sales,
                  securityStatus: "verified",
                  featured: false,
                  skillMd: "",
                  repoUrl: null,
                  installCommand: null,
                }}
                isPremium
                priceUsd={unified.premiumSkill.price_usd}
                creatorUsername={unified.premiumSkill.creator_username}
                creatorAvatar={unified.premiumSkill.creator_avatar}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
