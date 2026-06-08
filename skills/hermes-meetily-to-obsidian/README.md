# Hermes Meetily → Obsidian

Turn [Meetily](https://github.com/Zackriya-Solutions/meetily) exports into structured Obsidian meeting notes with Hermes.

This skill packages a reusable workflow plus a processor script for taking Meetily meeting exports, generating compact summaries, and writing canonical notes into an Obsidian vault.

## Best use cases

Use this skill when you want to:
- store Meetily meeting summaries in Obsidian automatically
- keep a raw transcript and a clean summary in separate files
- sync exports from a laptop to a server with Syncthing
- avoid duplicate meeting notes across reruns
- verify the whole pipeline is healthy before calling setup complete

## What it produces

```text
<VAULT>/Meetings/dd-mm-yyyy/<short-title>/
  summary.md
  raw.md
```

## Included files

- `SKILL.md`
- `scripts/process_exporter.py`
- `templates/summary-template.md`
- `references/exporter-format.md`
- `references/syncthing-setup.md`
- `references/testing-guide.md`

## Quick start

```bash
python3 scripts/process_exporter.py \
  --export-dir /root/meetily_exports \
  --vault /root/Obsidian \
  --cleanup-source keep
```

## Notes

- Summaries are capped at **280 words** and **2000 characters**.
- Split-machine mode expects Syncthing on both sides.
- The skill is designed for post-processing and storage, not live recording itself.

## Upstream app

- Meetily: https://github.com/Zackriya-Solutions/meetily
