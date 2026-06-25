/**
 * ARD domain metadata for the UI. The 28 domains mirror `shared/ard-taxonomy.ts`
 * `DOMAIN_ORDER`; kept as a lightweight client-side map (label + color) so the
 * full taxonomy module never ships in the browser bundle. Colors are stable hue
 * buckets used for capability chips and domain filters.
 */
export interface DomainMeta {
  id: string;
  label: string;
  /** Tailwind classes for a chip background + text in both themes. */
  chip: string;
  /** A small color swatch class for filter dots. */
  dot: string;
}

const RAW: Array<[string, string]> = [
  ["video", "Video"],
  ["audio", "Audio"],
  ["image", "Image"],
  ["3d", "3D"],
  ["design", "Design"],
  ["writing", "Writing"],
  ["seo", "SEO"],
  ["marketing", "Marketing"],
  ["ads", "Ads"],
  ["social", "Social"],
  ["sales", "Sales"],
  ["cx", "Customer Experience"],
  ["finance", "Finance"],
  ["legal", "Legal"],
  ["hr", "HR"],
  ["edu", "Education"],
  ["translate", "Translation"],
  ["transcribe", "Transcription"],
  ["qa-human", "Human QA"],
  ["admin", "Admin"],
  ["agentops", "Agent Ops"],
  ["realworld", "Real World"],
  ["code", "Code"],
  ["research", "Research"],
  ["data", "Data"],
  ["ops", "Ops"],
  ["comm", "Communication"],
  ["analytics", "Analytics"],
];

const PALETTE = [
  { chip: "bg-blue-500/15 text-blue-600 dark:text-blue-300", dot: "bg-blue-500" },
  { chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300", dot: "bg-violet-500" },
  { chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500" },
  { chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300", dot: "bg-amber-500" },
  { chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300", dot: "bg-rose-500" },
  { chip: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", dot: "bg-cyan-500" },
  { chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
  { chip: "bg-teal-500/15 text-teal-600 dark:text-teal-300", dot: "bg-teal-500" },
  { chip: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300", dot: "bg-indigo-500" },
  { chip: "bg-orange-500/15 text-orange-600 dark:text-orange-300", dot: "bg-orange-500" },
];

export const DOMAINS: DomainMeta[] = RAW.map(([id, label], i) => ({
  id,
  label,
  chip: PALETTE[i % PALETTE.length].chip,
  dot: PALETTE[i % PALETTE.length].dot,
}));

const BY_ID = new Map(DOMAINS.map((d) => [d.id, d]));

export function domainMeta(id: string): DomainMeta {
  return (
    BY_ID.get(id) ?? {
      id,
      label: id,
      chip: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    }
  );
}

/** Extract the domain segment from a capability URI like `hct:video:edit:short-form`. */
export function domainFromUri(uri: string): string {
  const parts = uri.split(":");
  return parts[1] ?? "";
}

/** Human label for a capability URI's leaf, e.g. `hct:video:edit:short-form` → `edit: short-form`. */
export function leafLabelFromUri(uri: string): string {
  const parts = uri.split(":").slice(2);
  if (parts.length === 0) return uri;
  if (parts.length === 1) return parts[0];
  return `${parts[0]}: ${parts.slice(1).join(" ")}`;
}
