---
name: audio-drama-production
description: Create short audio dramas from a story brief using multiple TTS voices, timed ambience, and a manifest-driven render pipeline. Best for audio-first storytelling, accessible creative tooling, and hackathon demos where the tool is part of the creative output.
version: "1.0.0"
license: MIT
compatibility: Hermes Agent and other SKILL.md-compatible agents
metadata:
  author: web3blind
  hermes:
    tags: [audio, tts, storytelling, sound-design, accessibility, edge-tts, ffmpeg]
    category: creative
    requires_tools: [terminal, file]
---

# Audio Drama Production

Turn a story brief or scene outline into a short multi-voice audio drama with timed background sounds and a final renderable audio file.

## When to Use
- The user wants to turn a story idea into an audio drama
- The user wants multiple TTS voices with explicit speaker switching
- The user wants background ambience or sound cues at specific moments
- The user needs an audio-first creative workflow instead of a visual-first one
- The user wants a fast hackathon-quality prototype for creative agent tooling

## Procedure

1. Define the target output: title, tone, duration, language, and main characters.
2. Cast distinct voices for each role. For English, a strong default pair is:
   - human male protagonist: `en-US-AndrewNeural`
   - female AI companion: `en-US-AvaNeural`
3. Adapt the source material for oral performance instead of literal reading.
   - Keep the emotional arc and turning points
   - Compress repetitive UI descriptions
   - Replace visual-only moments with audible signals such as typing, notification chimes, footsteps, room tone, or AI status messages
4. Store the screenplay in `assets/story.yaml`.
   Recommended scene structure:

```yaml
title: Example Audio Drama
sample_rate: 24000
scenes:
  - id: intro-night
    ambience: room_night
    intro_pause_ms: 600
    lines:
      - speaker: denis
        text: "Aishka, help me shape tonight's blog post."
        pause_after_ms: 350
      - speaker: aishka
        text: "Searching for information."
        pause_after_ms: 500
    cues:
      - type: typing
        start_ms: 1200
        duration_ms: 2600
        level: 0.18
```

5. Store voice mapping in `assets/voices.yaml`.
   Minimal example:

```yaml
sample_rate: 24000
roles:
  denis:
    voice: en-US-AndrewNeural
    rate: "+0%"
    pitch: "+0Hz"
    gain_db: 0.0
  aishka:
    voice: en-US-AvaNeural
    rate: "+0%"
    pitch: "+0Hz"
    gain_db: -1.0
```

6. Render each spoken line with Edge TTS.
7. Convert all rendered lines to a shared mono WAV format.
8. Generate ambience beds and one-shot cues. A good reusable palette is:
   - `room_night`
   - `room_morning`
   - `typing`
   - `notification`
   - `walk_outside`
   - `thinking_ai`
   - `success_glow`
   - `ad_research`
9. Mix scene-by-scene on a shared timeline.
10. Export a WAV master, encode MP3, and save a render manifest with timings.

## Publishing a Demo Repo

When packaging this workflow as a public repo, keep it reproducible and lightweight.

Recommended structure:
- `assets/`
- `docs/`
- `scripts/`
- `skill/`
- `README.md`
- `requirements.txt`
- `LICENSE`
- demo artifacts: `build/final_mix.mp3`, `build/render_manifest.json`

Ignore generated intermediates:
- `build/tmp/`
- `build/lines/`
- `build/scenes/`
- `*.wav`
- `__pycache__/`

## Pitfalls
- Literal translation usually sounds stiff. Rewrite for speech.
- Too many sound cues make the result noisy and confusing.
- Two similar TTS voices make speaker changes hard to follow.
- Long scenes without pauses flatten the drama.
- Background sounds must be intentional; random ambience everywhere weakens the piece.
- Keep speech louder than ambience. Atmosphere should support the story, not overpower it.

## Verification
- All scenes render successfully
- No voice files are missing
- The final MP3 exists and plays correctly
- The final duration is plausible for the script length
- Female AI roles consistently use the intended female voice
- Background sounds appear at the intended moments
- The output is understandable without needing any visual context
