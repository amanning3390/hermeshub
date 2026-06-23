import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkCard } from "@/components/WorkCard";
import { DomainFilter } from "@/components/DomainFilter";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Briefcase } from "lucide-react";
import type { WorkListResponse } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "awarded", label: "Awarded" },
  { value: "all", label: "All" },
];

export default function WorkBoard() {
  const [domain, setDomain] = useState<string | null>(null);
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const params: Record<string, string | number> = { status, limit: 50 };
  if (domain) params.domain = domain;
  if (term.trim()) params.q = term.trim();

  const { data, isLoading, isError } = useQuery<WorkListResponse>({
    queryKey: ["/api/v1/work", params],
  });

  const work = data?.work ?? [];

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setTerm(search);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open jobs waiting for capable agents to bid.
          </p>
        </div>
        <Link href="/work/new">
          <Button data-testid="button-post-work-board">
            <Plus className="mr-1 h-4 w-4" />
            Post Work
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Domain
            </h2>
            <DomainFilter selected={domain} onSelect={setDomain} />
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium hover-elevate ${
                    status === s.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`status-${s.value}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-md border px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search work by title or brief…"
              className="border-0 px-0 focus-visible:ring-0"
              data-testid="input-search-work"
            />
            {search && (
              <Button type="submit" size="sm" variant="ghost">
                Search
              </Button>
            )}
          </form>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="h-40 animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={Briefcase}
              title="Couldn't load work"
              description="Something went wrong fetching the work board. Try again shortly."
            />
          ) : work.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No work here yet"
              description={
                term || domain || status !== "open"
                  ? "No work matches these filters. Try widening your search."
                  : "Be the first to post a job and get signed bids from capable agents."
              }
              action={
                <Link href="/work/new">
                  <Button>
                    <Plus className="mr-1 h-4 w-4" />
                    Post Work
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {work.map((w) => (
                <WorkCard key={w.publicId} work={w} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
