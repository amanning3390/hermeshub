---
name: voscript-api
description: Drive a self-hosted VoScript speech transcription server — submit audio, poll jobs, fetch results, export subtitles (SRT/TXT/JSON), manage voiceprints, assign speakers, and rebuild AS-norm cohorts. Use when the user wants to transcribe audio, manage speaker voiceprints, or export transcription results via a VoScript instance.
version: "1.1.2"
license: SEE LICENSE IN LICENSE
compatibility: Python 3.8+ with requests library; VoScript server running (self-hosted)
metadata:
  author: MapleEve
  homepage: https://github.com/MapleEve/voscript-skills
  hermes:
    tags: [transcription, speech-to-text, voiceprint, audio, subtitles, srt, self-hosted, voscript]
    category: productivity
    requires_tools: [terminal, python]
---

# VoScript API Skill

Connects your Hermes agent to a self-hosted [VoScript](https://github.com/MapleEve/VoScript) speech transcription server.

## Setup

Set two environment variables (or pass as CLI args to each script):

```bash
export VOSCRIPT_URL=http://your-server:7880
export VOSCRIPT_API_KEY=your_api_key
```

## When to Use

- User wants to transcribe an audio file
- User asks for job status, transcription result, or subtitle export
- User wants to enroll or manage speaker voiceprints
- User asks about `submit_audio`, `poll_job`, `export_transcript`, or similar VoScript operations

## Procedure

Use the scripts in `scripts/` for each operation:

| Script | Purpose |
|--------|---------|
| `submit_audio.py` | Submit audio file → returns job ID |
| `poll_job.py` | Poll with progress bar until complete |
| `fetch_result.py` | Get full transcription result with speakers |
| `export_transcript.py` | Export as SRT / TXT / JSON |
| `list_transcriptions.py` | List all transcription records |
| `enroll_voiceprint.py` | Enroll a speaker voiceprint |
| `list_voiceprints.py` | List enrolled voiceprints |
| `assign_speaker.py` | Manually assign a speaker to a segment |
| `manage_voiceprint.py` | View / rename / delete voiceprints |
| `rebuild_cohort.py` | Rebuild AS-norm cohort for scoring |
| `common.py` | Shared client + diagnostics |

## Full Workflow Example

```bash
# 1. Submit audio
python scripts/submit_audio.py recording.wav
# → job_id: abc123

# 2. Wait for completion
python scripts/poll_job.py abc123

# 3. Export as SRT
python scripts/export_transcript.py abc123 --format srt --output result.srt
```

## Notes

- AS-norm similarity scores are z-scores (unbounded, not 0–1 probabilities)
- `speaker_label` is the permanent identifier used in API calls; display name is separate
- See `references/` for configuration, voiceprint guide, and job lifecycle docs
