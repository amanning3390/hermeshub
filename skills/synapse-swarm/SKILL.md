---
name: synapse-swarm
description: Multi-agent cognitive swarm with three chained AI agents — ZERO (vision analyst), NOVA (tactical strategist), and TITAN (final arbiter) — that collaboratively analyze visual input through a Streamlit dashboard. Supports voice and text commands with TTS output.
version: "1.0.0"
license: MIT
compatibility: Hermes Agent with camera/vision access
metadata:
  author: devorun
  hermes:
    tags: [swarm, multi-agent, vision, camera, voice, streamlit, chain-of-thought, tactical]
    category: agents
    requires_tools: [hermes-chat, camera, speech-recognition]
---

# Synapse Swarm

A three-agent cognitive swarm system for real-time visual analysis using Hermes Agent.

## When to Use
- Analyzing camera or image input with multi-perspective AI reasoning
- Running a chained agent pipeline: vision → strategy → arbitration
- Building operator dashboards with real-time agent collaboration
- Voice-controlled agent workflows with text-to-speech feedback
- Tactical or creative analysis requiring multiple AI viewpoints

## How It Works

Synapse Swarm chains three specialized agents in sequence:

1. **ZERO (Vision Analyst)** — Receives the operator's command and a camera snapshot. Describes key visual details with tactical precision.
2. **NOVA (Tactical Strategist)** — Reads ZERO's visual scan and the original command. Suggests a creative strategic angle based on the observed object or scene.
3. **TITAN (Arbiter)** — Receives all prior context — the command, ZERO's scan, and NOVA's tactic — then delivers a final one-sentence verdict. TITAN's response is also spoken aloud via text-to-speech.

Each agent calls `hermes chat` under the hood, forming a chain-of-thought pipeline where each agent builds on the previous one's output.

## Architecture

```
Operator Command (voice or text)
        │
        ▼
   ┌─────────┐
   │  ZERO   │  ← Camera snapshot + command
   │ (Vision)│
   └────┬────┘
        │ visual scan
        ▼
   ┌─────────┐
   │  NOVA   │  ← ZERO's scan + command
   │(Tactical)│
   └────┬────┘
        │ tactical angle
        ▼
   ┌─────────┐
   │  TITAN  │  ← All context → final verdict (+ TTS)
   │(Arbiter)│
   └─────────┘
```

## Features

- **Chained multi-agent reasoning** — Each agent receives the full context chain from previous agents
- **Customizable system prompts** — Modify each agent's core directives via the sidebar
- **Dual input modes** — Voice commands (auto-detected language: TR/EN) and text input
- **Text-to-speech output** — TITAN's final verdict is spoken aloud automatically
- **Export reports** — Download the full swarm analysis as a `.txt` file
- **Cyberpunk Streamlit UI** — Animated GIF avatars, translucent panels, neon accents

## Requirements

- Python 3.8+
- Hermes Agent CLI (`hermes chat`)
- Streamlit
- Pillow, SpeechRecognition, gTTS, audiorecorder
- Camera access (for live snapshot input)

## Quick Start

```bash
pip install streamlit pillow SpeechRecognition gTTS streamlit-audiorecorder
streamlit run app.py
```

## Customization

Agent prompts can be edited in the sidebar at runtime. Each prompt supports these variables:
- `{command}` — The operator's directive
- `{zero_scan}` — ZERO's visual analysis output
- `{nova_tactic}` — NOVA's tactical suggestion

## Source

- **Repository**: [github.com/devorun/synapse-swarm](https://github.com/devorun/synapse-swarm)
- **Author**: [@Devran1An](https://x.com/Devran1An)
