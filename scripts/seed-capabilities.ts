/**
 * Seed the `capabilities` table with the Hermes Capability Taxonomy (HCT v1).
 *
 * Idempotent: re-running upserts by primary key (`uri`) so it is safe to run
 * against an already-seeded database. Work capabilities (28 domains, ~280 leaf
 * URIs) and qualifier dimensions (gpu/geo/lang/…) are seeded in one pass;
 * qualifiers carry `is_qualifier = true` per plan §3.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-capabilities.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { capabilities } from "../shared/schema.js";
import {
  buildTaxonomy,
  buildQualifiers,
  HCT_SPEC_VERSION,
  type CapabilityNode,
} from "../shared/ard-taxonomy.js";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
}

function toRow(node: CapabilityNode) {
  return {
    uri: node.uri,
    parentUri: node.parentUri,
    domain: node.domain,
    leaf: node.leaf,
    displayName: node.displayName,
    description: node.description,
    isQualifier: node.isQualifier,
    exampleQueries: node.exampleQueries,
    synonyms: node.synonyms,
    specVersion: HCT_SPEC_VERSION,
  };
}

async function main(): Promise<void> {
  const db = drizzle(neon(getDatabaseUrl()));

  const workNodes = buildTaxonomy();
  const qualifierNodes = buildQualifiers();
  const allNodes = [...workNodes, ...qualifierNodes];

  const rows = allNodes.map(toRow);

  // Upsert in batches to stay within statement-size limits.
  const BATCH = 100;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db
      .insert(capabilities)
      .values(batch)
      .onConflictDoUpdate({
        target: capabilities.uri,
        set: {
          parentUri: sql`excluded.parent_uri`,
          domain: sql`excluded.domain`,
          leaf: sql`excluded.leaf`,
          displayName: sql`excluded.display_name`,
          description: sql`excluded.description`,
          isQualifier: sql`excluded.is_qualifier`,
          exampleQueries: sql`excluded.example_queries`,
          synonyms: sql`excluded.synonyms`,
          specVersion: sql`excluded.spec_version`,
        },
      });
    written += batch.length;
  }

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(capabilities);
  const work = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(capabilities)
    .where(sql`${capabilities.isQualifier} = false`);

  process.stdout.write(
    [
      `Seeded ${written} capability rows (${workNodes.length} work leaves + ${qualifierNodes.length} qualifiers).`,
      `capabilities total:            ${total[0].count}`,
      `capabilities (work, non-qual): ${work[0].count}`,
    ].join("\n") + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(`seed-capabilities failed: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
