import { useState } from "react";
import { DOMAINS } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface DomainFilterProps {
  selected: string | null;
  onSelect: (domain: string | null) => void;
  /** How many chips to show before "Show all". */
  collapsedCount?: number;
}

/** Sidebar domain filter — one selectable domain at a time, collapsed by default. */
export function DomainFilter({ selected, onSelect, collapsedCount = 8 }: DomainFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? DOMAINS : DOMAINS.slice(0, collapsedCount);

  return (
    <div className="space-y-2" data-testid="domain-filter">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium hover-elevate",
            selected === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          All domains
        </button>
        {visible.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(selected === d.id ? null : d.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium hover-elevate",
              selected === d.id ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
            data-testid={`domain-${d.id}`}
          >
            <span className={cn("h-2 w-2 rounded-full", d.dot)} />
            {d.label}
          </button>
        ))}
      </div>
      {DOMAINS.length > collapsedCount && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${DOMAINS.length}`}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
