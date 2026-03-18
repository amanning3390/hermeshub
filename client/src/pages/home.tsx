import { Link } from "wouter";
import { Search, ArrowRight, ShieldCheck, Package, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkillCard } from "@/components/SkillCard";
import { getSkills, getFeaturedSkills, searchSkills } from "@/lib/skills-data";
import type { Skill } from "@/lib/skills-data";
import { useState, useMemo } from "react";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const featured = getFeaturedSkills();
  const allSkills = getSkills();

  const searchResults = useMemo(() => {
    if (searchQuery.length > 1) {
      return searchSkills(searchQuery);
    }
    return null;
  }, [searchQuery]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-xs px-3 py-1">
              Compatible with agentskills.io
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              The Skills Hub for{" "}
              <span className="text-primary">Hermes Agent</span>
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed px-2">
              Browse, install, and share verified skills for the self-improving AI agent by Nous Research.
              Security-scanned. Open standard. Community-driven.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="relative max-w-lg mx-auto mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search skills by name, category, or keyword..."
                className="pl-10 h-11 bg-card border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </form>

            {/* Search results dropdown */}
            {searchResults && searchResults.length > 0 && (
              <div className="max-w-lg mx-auto mb-8">
                <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
                  {searchResults.slice(0, 5).map((skill) => (
                    <Link key={skill.id} href={`/skill/${skill.name}`}>
                      <div className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between" data-testid={`search-result-${skill.name}`}>
                        <div className="text-left">
                          <p className="text-sm font-medium">{skill.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{skill.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] ml-2 flex-shrink-0">{skill.category}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/browse">
                <Button size="default" className="gap-2" data-testid="button-browse">
                  Browse Skills <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/submit">
                <Button variant="outline" size="default" className="gap-2" data-testid="button-submit">
                  Submit a Skill
                </Button>
              </Link>
            </div>
          </div>

          {/* Install command */}
          <div className="max-w-lg mx-auto mt-10">
            <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Install from HermesHub</p>
              <code className="text-xs sm:text-sm font-mono text-primary block break-all">
                hermes skills install github:amanning3390/hermeshub/skills/&lt;skill-name&gt;
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Why HermesHub */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <ShieldCheck className="h-5 w-5 text-green-500" />,
              title: "Security-First",
              desc: "Every PR is automatically scanned by our GitHub Action against 65+ threat rules across 8 categories — exfiltration, prompt injection, destructive commands, obfuscation, hardcoded secrets, network abuse, env abuse, and supply-chain attacks. Critical findings block the merge. Even admins can't bypass.",
            },
            {
              icon: <Package className="h-5 w-5 text-primary" />,
              title: "Open Standard",
              desc: "Built on the agentskills.io spec. Skills work across Hermes Agent and any compatible agent. Portable, versioned, community-owned.",
            },
            {
              icon: <Zap className="h-5 w-5 text-amber-500" />,
              title: "Built for Hermes",
              desc: "Designed for Hermes Agent's progressive disclosure, conditional activation, and self-improvement loop. Skills that evolve.",
            },
          ].map((feature, i) => (
            <div key={i} className="border border-border rounded-lg p-6 bg-card" data-testid={`card-feature-${i}`}>
              <div className="mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Skills */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Featured Skills</h2>
            <p className="text-sm text-muted-foreground mt-1">Curated and verified by the HermesHub team</p>
          </div>
          <Link href="/browse">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" data-testid="link-browse-all">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 mb-8">
        <h2 className="text-xl font-bold mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "development", label: "Development", icon: "💻" },
            { name: "productivity", label: "Productivity", icon: "📋" },
            { name: "research", label: "Research", icon: "🔬" },
            { name: "devops", label: "DevOps", icon: "⚙️" },
            { name: "security", label: "Security", icon: "🔒" },
            { name: "data", label: "Data & Analytics", icon: "📊" },
            { name: "communication", label: "Communication", icon: "💬" },
            { name: "documentation", label: "Documentation", icon: "📝" },
          ].map((cat) => (
            <Link key={cat.name} href={`/browse/${cat.name}`}>
              <div
                className="border border-border rounded-lg p-4 bg-card hover:border-primary/40 transition-all cursor-pointer"
                data-testid={`card-category-${cat.name}`}
              >
                <span className="text-xl mb-2 block">{cat.icon}</span>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{allSkills.filter(s => s.category === cat.name).length} skills</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 mb-8">
        <div className="border border-border rounded-lg p-6 md:p-8 bg-card">
          <div className="flex items-start gap-4">
            <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-0.5 hidden sm:block" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold mb-2">New to Hermes Agent?</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Hermes Agent is the self-improving AI agent by Nous Research with a built-in learning loop.
                Install skills to extend its capabilities — from coding and research to DevOps and security.
              </p>
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-background p-3 overflow-x-auto">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">1. Install Hermes Agent</p>
                  <code className="text-xs font-mono text-primary break-all whitespace-pre-wrap">
                    curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
                  </code>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">2. Browse and install skills</p>
                  <code className="text-xs font-mono text-primary">
                    hermes skills browse
                  </code>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">3. Use skills via slash commands or chat</p>
                  <code className="text-xs font-mono text-primary">
                    /google-workspace check my calendar for today
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
