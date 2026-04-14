---
name: hermes-sci
title: Hermes-Native Autonomous Research Writer
description: Produce ML research paper drafts from a topic or idea — ideation, LaTeX writeup, peer-review — wired to Hermes' current LLM provider (no OpenAI/Anthropic keys required). Anti-hallucination numerical audit built in.
version: 0.1.0
author: easyvibecoding
license: Apache-2.0
homepage: https://github.com/easyvibecoding/hermes-sci
dependencies: [openai, jinja2]
platforms: [macos, linux]
metadata:
  hermes:
    tags: [Research, Paper Writing, LaTeX, Ideation, Peer Review, MLOps, MiniMax, OpenAI, DeepSeek, Hardware Aware, Anti Hallucination]
    category: research
    related_skills: [arxiv, research-paper-writing, ocr-and-documents]
    requires_toolsets: [terminal, files]
trigger:
  - "hermes-sci"
  - "autonomous research"
  - "write a research paper"
  - "generate a paper draft"
  - "paper writeup"
  - "ideation and writeup"
  - "peer review this paper"
---

# Hermes-Native Autonomous Research Writer

Turns a research topic into a compileable `.tex` + `.pdf` draft, using Hermes'
currently-configured LLM provider. No extra API keys, no `conda`, no
[SakanaAI/AI-Scientist](https://github.com/SakanaAI/AI-Scientist) install —
a 700-line Python package does the full pipeline.

## When To Use This Skill

- Drafting a short position paper / workshop submission from a topic string
- Ideation + novelty triage for a research direction (returns scored idea list)
- Writing up **your own** experiment results as a publication-ready LaTeX doc
  (you supply `results.json`; the skill refuses to fabricate numbers)
- Running NeurIPS-style ensemble review on an existing paper PDF

This skill is **not** for auto-running experiments — Phase 3 takes
author-supplied results and performs a numerical-claim audit instead of
hallucinating metrics.

## Quick Reference

| Task | Command |
|------|---------|
| Generate ideas | `hermes-sci ideate --topic "..." --num-ideas 5 -o ideas.json` |
| Paper from idea | `hermes-sci writeup --ideas-json ideas.json --idx 0 -o ./paper/` |
| Paper with results | `hermes-sci writeup --ideas-json ideas.json --idx 0 --results-json results.json -o ./paper/` |
| Review a PDF | `hermes-sci review --paper paper.pdf --ensemble 5` |
| End-to-end | `hermes-sci pipeline --topic "..." -o ./run/` |

All commands accept `--backend {minimax,hybrid}` (default `minimax`). The
skill reads `~/.hermes/config.yaml` to resolve the current provider
(MiniMax / OpenAI / DeepSeek / Moonshot / Gemini / Groq / etc.).

## Install

```bash
pip install 'hermes-sci @ git+https://github.com/easyvibecoding/hermes-sci#subdirectory=skills/hermes-sci/package'
# or editable from a local checkout:
pip install -e ~/.hermes/skills/hermes-sci/package
```

Requirements: `pdflatex` + `chktex` (TeX Live / MacTeX). The skill verifies
both at start and prints install hints if missing.

## Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 hermes-sci paper pipeline                   │
│                                                             │
│  ideate ──► rank ideas ──► writeup ──► verify ──► review    │
│     │          │              │           │         │       │
│     ▼          ▼              ▼           ▼         ▼       │
│  ideas.json   top-1       paper.tex   report.json  review   │
│               idea        paper.pdf   (audit)      .json    │
│                                                             │
│  Backend auto-resolved: Hermes provider (MiniMax/OpenAI/…)  │
│  Concurrency auto-throttled in MiniMax peak 15:00–17:30 SH  │
└─────────────────────────────────────────────────────────────┘
```

## Backends

| Backend | OpenAI-compatible calls | Anthropic-SDK calls | Use when |
|---|---|---|---|
| `minimax` (default) | Hermes current provider endpoint | same endpoint | Text-only workloads, zero extra spend |
| `hybrid` | Hermes current provider | Local `claude -p` shim at :9099 | Coding-heavy sections, Claude Max subscription |

## Quality & Safety

- **Hardware-aware prompting** — LLM is told "Apple M2 MPS 16 GB" so it
  doesn't claim A100 training runs. Honest hardware claims in the paper.
- **Section self-critique** — every section is drafted, then critiqued +
  revised; fallback to draft if critique degenerates (validator-protected).
- **Citation whitelist** — `\cite{KEY}` with keys not in `references.bib`
  are stripped automatically.
- **Reasoning-model artefacts stripped** — `<think>…</think>` blocks from
  MiniMax-M2.7 / DeepSeek-R1 are removed before LaTeX compile.
- **Anti-hallucination numerical audit (Phase 3)** — when `--results-json`
  is supplied, every decimal / percentage in the paper is cross-checked
  against the user's metrics + tables; unverified numbers can be coloured
  red in the PDF via `--annotate-unverified`.
- **LaTeX-log-driven retry** — pdflatex failure triggers a targeted
  parallel fix pass on each section, not full paper regeneration.

## results.json schema

```json
{
  "setup": {
    "hardware": "Apple M2 MPS 16 GB",
    "framework": "PyTorch 2.7.1",
    "dataset": "WMT14 En-De",
    "hyperparams": {"lr": 0.0001, "batch_size": 16, "epochs": 20}
  },
  "metrics": [
    {"name": "BLEU", "value": 28.31, "method": "baseline", "split": "test"},
    {"name": "latency", "value": 42.7, "unit": "ms", "method": "baseline"}
  ],
  "tables": [
    {
      "id": "complexity_buckets",
      "caption": "Results by input complexity",
      "headers": ["Complexity", "BLEU", "Latency_ms"],
      "rows": [["Simple", "28.12", "19.4"], ["Medium", "27.61", "27.3"]]
    }
  ],
  "raw_log": "stdout / stderr dump (optional; used as evidence)"
}
```

Every number in the paper is verified against this file. Fabricated
figures are flagged in `verification_report.json` with a verification
rate (target ≥ 95% against a well-specified results blob).

## Example: 5-minute workshop draft

```bash
hermes-sci pipeline \
    --topic "Input-adaptive MoE routing via hardness estimation" \
    --num-ideas 3 \
    --results-json ./hamr_results.json \
    -o ./run/
```

Produces:
- `run/ideas.json` (3 scored research ideas)
- `run/paper/paper.pdf` (4-page NeurIPS-style PDF)
- `run/paper/verification_report.json` (~97% claim verification)
- `run/review.json` (5-sample ensemble review + Accept/Reject)

Total time: 2–5 minutes off-peak on MiniMax Starter.

## Pitfalls

- **MiniMax peak hours** (weekdays 15:00–17:30 Asia/Shanghai) collapse Starter
  concurrency to 1 — the skill auto-throttles. Run large benchmarks off-peak.
- **pdflatex missing** — install via `brew install --cask mactex-no-gui`
  (macOS) or `apt install texlive-full` (Debian/Ubuntu). Also need `chktex`:
  `conda install -c conda-forge chktex` or `brew install chktex`.
- **Hybrid backend** needs `claude -p` binary in PATH (Claude Max subscription).
  Start the proxy: `bash scripts/claude_proxy_ctl.sh start`.
- **Results JSON required for honest numbers** — without it the writeup
  describes the protocol qualitatively and marks the results section as
  "Results forthcoming." Do not rely on the skill to invent data.

## Upstream

- Python package: `~/.hermes/my-skills/hermes-sci/package/` (editable install)
- Repo: https://github.com/easyvibecoding/hermes-sci (not yet published)
- Issues / feedback: GitHub issues on the repo above
