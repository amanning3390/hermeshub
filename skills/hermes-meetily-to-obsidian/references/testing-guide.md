# Testing and verification guide

## 0) Topology check

Ask first:

- Are Meetily, Obsidian, and Hermes on the same machine?

### Same-machine checklist

- Meetily is installed or otherwise producing exports locally.
- Hermes is installed and callable.
- The local Obsidian vault path exists and is writable.
- Syncthing is optional unless the user explicitly wants multi-device sync.

### Split-machine checklist

- Meetily is installed on the user device that produces the exports.
- Syncthing is installed on the user device.
- Syncthing is installed on the Hermes/Obsidian server.
- The server export inbox exists and is writable.
- The Obsidian vault path exists and is writable.

## 1) Dry run

Place a sample export in the export folder and run:

```bash
python3 scripts/process_exporter.py \
  --export-dir /root/meetily_exports \
  --vault /root/Obsidian \
  --cleanup-source move \
  --min-age 1 \
  --dry-run
```

Verify the output says `would process ...` and that no files were moved.

## 2) Live run

Run again without `--dry-run` and confirm:

- `Meetings/<date>/<title>/summary.md` exists
- `Meetings/<date>/<title>/raw.md` exists
- cleanup behavior matches the chosen mode
- `processed.db` contains the source entry

## 3) Summary quality validation

Confirm that `summary.md`:

- is a real thematic summary, not transcript snippets
- stays within **280 words**
- stays within **2000 characters**
- uses concise topic-based structure

## 4) Final readiness checklist

Before declaring the workflow ready, verify:

- topology was identified correctly
- Meetily/export source exists
- Hermes command works on the processing machine
- processor script exists and runs cleanly
- Obsidian vault path exists and is writable
- if split-machine: Syncthing is installed on both sides
- if split-machine: Syncthing is running on both sides
- if split-machine: the shared folder is healthy with no active sync errors
- if automation is expected: timer/service/cron is enabled and healthy
- logs show no unresolved processing or sync failures

## 5) Troubleshooting

- If files are not appearing, check Syncthing folder health, sharing status, and folder IDs.
- If files are skipped, reduce `--min-age` temporarily for testing.
- If the summary quality is poor, inspect the merged transcript input first.
- Do not return a final **ready** state until the readiness checklist is green.
