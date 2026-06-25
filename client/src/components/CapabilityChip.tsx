import { cn } from "@/lib/utils";
import { domainFromUri, domainMeta, leafLabelFromUri } from "@/lib/domains";
import { X } from "lucide-react";

interface CapabilityChipProps {
  uri: string;
  label?: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}

/** ARD capability pill with domain color coding. */
export function CapabilityChip({
  uri,
  label,
  onRemove,
  onClick,
  className,
  selected,
}: CapabilityChipProps) {
  const meta = domainMeta(domainFromUri(uri));
  const text = label ?? leafLabelFromUri(uri);
  const interactive = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        meta.chip,
        interactive && "cursor-pointer hover-elevate",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        className,
      )}
      title={uri}
      data-testid={`chip-${uri}`}
    >
      <span className="opacity-60">{meta.label}</span>
      <span className="truncate">{text}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove ${text}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
