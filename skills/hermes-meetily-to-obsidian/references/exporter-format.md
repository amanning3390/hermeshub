# Supported exporter formats

This skill supports two input shapes.

## 1) Meetily folder export

A meeting folder containing at least:

- `metadata.json`
- `transcripts.json`

The processor reads both files, builds a readable transcript, then writes structured Obsidian output.

## 2) Markdown export fallback

A single markdown file with frontmatter plus transcript content.

Expected frontmatter fields when available:

- `title`
- `meeting_id`
- `date`
- `participants`
- `duration`

## Important rule

Prefer the folder export when possible. It is less fragile and gives the processor structured metadata plus transcript segments.
