import { useParams, Link } from "wouter";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkillCard } from "@/components/SkillCard";
import { getSkills } from "@/lib/skills-data";
import { useState, useMemo } from "react";

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

export default function BrowsePage() {
  const params = useParams<{ category?: string }>();
  const activeCategory = params.category || "all";
  const [searchQuery, setSearchQuery] = useState("");

  const skills = getSkills();

  const filtered = useMemo(() => {
    let result = skills;
    if (activeCategory !== "all") {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [skills, activeCategory, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Browse Skills</h1>
        <p className="text-sm text-muted-foreground">
          {skills.length} verified skills for Hermes Agent
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.name;
          const count =
            cat.name === "all"
              ? skills.length
              : skills.filter((s) => s.category === cat.name).length;
          return (
            <Link key={cat.name} href={cat.name === "all" ? "/browse" : `/browse/${cat.name}`}>
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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Filter className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No skills found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
