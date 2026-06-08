---
name: hermes-meetily-to-obsidian
description: Use when Meetily exports should be turned into structured Obsidian meeting notes with Hermes. Supports same-machine and split-machine setups, Syncthing-based sync, transcript summarization, deduplication, and readiness checks.
version: "0.3.0"
license: MIT
compatibility: Requires Python 3.11+ for the processor script. Split-machine setups also require Syncthing on both sides.
metadata:
  author: 0xdeval + Mike Krupin
  hermes:
    tags: [meetily, obsidian, syncthing, meeting-notes, automation, transcripts]
    category: productivity
    requires_tools: [terminal, file]
---

# Hermes Meetily → Obsidian

Turn Meetily exports into canonical Obsidian meeting notes with Hermes.

This skill is for users who already have Meetily producing meeting exports and want Hermes to normalize them into a clean Obsidian structure with one meeting folder per meeting, a compact summary, the raw transcript, and a final readiness checklist.

**Meetily:** https://github.com/Zackriya-Solutions/meetily

## When to Use
- The user records or exports meetings with Meetily
- The user wants summaries and raw transcripts stored in Obsidian
- The setup may be same-machine or split-machine
- The user wants Syncthing used to move exports from a user device to a processing server
- The workflow needs deduplication and safe reprocessing
- The user wants Hermes to verify that services are healthy before claiming setup is finished

Do not use for:
- live recording itself
- direct Meetily internal database integration
- workflows that need multiple parallel note formats from one export

## Procedure

### 1. Ask the topology question first
Always ask:
- Are Meetily, Obsidian, and Hermes on the same machine?

### 2. Same-machine setup
If yes:
1. Verify Meetily, Obsidian, and Hermes are installed locally
2. Choose a local export folder
3. Point the processor directly at the local Obsidian vault
4. Skip Syncthing unless the user explicitly wants multi-device vault sync

### 3. Split-machine setup
If no:
1. Install Meetily on the user machine producing exports
2. Install Syncthing on the user machine
3. Install or verify Syncthing on the Hermes + Obsidian server
4. Share the export folder as **Send Only** from the user machine
5. Receive it into a server inbox such as `/root/meetily_exports` as **Receive Only**
6. Verify Hermes can read the inbox and write to the Obsidian vault

### 4. Expected export shapes
Preferred input:
- a Meetily meeting folder containing:
  - `metadata.json`
  - `transcripts.json`

Fallback input:
- a markdown export with frontmatter and transcript text

### 5. Output layout
Write meetings to:

```text
<VAULT>/Meetings/dd-mm-yyyy/<short-title>/
  summary.md
  raw.md
```

### 6. Run the processor
```bash
python3 scripts/process_exporter.py \
  --export-dir /root/meetily_exports \
  --vault /root/Obsidian \
  --cleanup-source keep
```

Useful options:
- `--dry-run` — preview processing
- `--reprocess-all` — rebuild notes from already-seen exports
- `--cleanup-source keep` — keep source exports
- `--cleanup-source move` — move sources into `.processed/`
- `--cleanup-source delete` — delete sources after success

### 7. Summary behavior
- Summaries must be real thematic summaries, not transcript dumps
- Hard cap output to:
  - 280 words
  - 2000 characters
- Keep timestamps in `raw.md`, not in `summary.md`

## Files Included
- `README.md` — polished repository and usage overview
- `references/exporter-format.md` — supported exporter shapes
- `references/syncthing-setup.md` — split-machine Syncthing guide
- `references/testing-guide.md` — readiness checklist and troubleshooting
- `scripts/process_exporter.py` — processor implementation
- `templates/summary-template.md` — summary template

## Pitfalls
- Do not skip the topology question; same-machine and split-machine setups need different instructions
- Do not point Meetily exports directly at the Obsidian vault
- Do not assume markdown-only exports; real Meetily exports are commonly folders with `metadata.json` and `transcripts.json`
- Do not declare the setup ready before checking sync health, processor health, and vault writeability
- Do not automatically regenerate historical notes unless the user explicitly asks for backfill

## Verification
- Confirm topology was identified correctly
- Confirm Meetily is installed or producing exports
- Confirm Hermes is callable on the processing machine
- Confirm the Obsidian vault path exists and is writable
- If split-machine: confirm Syncthing is installed and healthy on both sides
- Confirm the processor runs successfully
- Confirm summaries stay within 280 words and 2000 characters
- Confirm there are no unresolved sync or processing errors in logs/status output
