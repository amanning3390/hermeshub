import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CapabilityChip } from "@/components/CapabilityChip";
import { domainMeta, domainFromUri } from "@/lib/domains";
import { Plus, Search } from "lucide-react";
import type { Capability } from "@/lib/types";

interface AutosuggestTagInputProps {
  selected: string[];
  onChange: (uris: string[]) => void;
}

/** Combobox over the capability registry with server-side search. */
export function AutosuggestTagInput({ selected, onChange }: AutosuggestTagInputProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const { data, isLoading } = useQuery<{ capabilities: Capability[] }>({
    queryKey: ["/api/v1/capabilities", { q: term, limit: 20 }],
    enabled: open && term.trim().length >= 2,
  });

  const results = (data?.capabilities ?? []).filter((c) => !selected.includes(c.uri));

  function add(uri: string) {
    if (!selected.includes(uri)) onChange([...selected, uri]);
    setTerm("");
  }

  function remove(uri: string) {
    onChange(selected.filter((u) => u !== uri));
  }

  return (
    <div className="space-y-2" data-testid="autosuggest-tag-input">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((uri) => (
          <CapabilityChip key={uri} uri={uri} onRemove={() => remove(uri)} />
        ))}
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground">No capabilities selected yet.</span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" data-testid="button-add-capability">
            <Plus className="mr-1 h-4 w-4" />
            Add capability
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start">
          <div className="flex items-center gap-2 rounded-md border px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search 268 capabilities…"
              className="border-0 px-0 focus-visible:ring-0"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto">
            {term.trim().length < 2 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Type at least 2 characters.</p>
            ) : isLoading ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
            ) : (
              <ul className="space-y-1">
                {results.map((c) => (
                  <li key={c.uri}>
                    <button
                      type="button"
                      onClick={() => add(c.uri)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover-elevate"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${domainMeta(domainFromUri(c.uri)).dot}`} />
                      <span className="truncate">{c.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
