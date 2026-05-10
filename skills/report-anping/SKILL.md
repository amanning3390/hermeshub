---
name: report-anping
description: >-
  WeChat-driven seismic safety evaluation report generator compliant with
  GB 17741-2025. Collects 13 project parameters through multi-turn dialogue,
  generates chapter prompts for Hermes LLM to write, renders a formatted .docx
  report (inline bold/italic, auto-numbered tables & figures), and runs a
  compliance check. Supports automatic generation of response spectrum charts,
  PGA comparison charts, M-T charts, epicenter maps, and focal depth plots from
  CEIC catalog data. Trigger words: seismic evaluation, 安评, GB 17741,
  earthquake safety report.
version: "1.3.0"
author: Mark7766
license: MIT
metadata:
  hermes:
    tags:
      - seismic
      - gb17741
      - report-generation
      - docx
      - earthquake
      - china
    category: domain
    requires_tools:
      - terminal
    compatibility: >-
      Python 3.11+. Requires python-docx, matplotlib>=3.8, markdown, Pillow.
      Install via: pip install -r requirements.txt
    source: https://github.com/Mark7766/report-anping
---

# 地震安全性评价报告生成 (Seismic Safety Evaluation Report Generator)

## Overview

This skill automates the full lifecycle of a **GB 17741-2025 seismic safety
evaluation report** through WeChat / Hermes multi-turn dialogue:

1. **Parameter collection** — 13 project fields gathered one-by-one, saved to
   `params.json`
2. **Chapter generation** — per-chapter prompts built by `build_chapter_prompt.py`;
   Hermes LLM writes Markdown; saved to `chapters/`
3. **Figure generation** — `generate_figures.py` produces response spectrum,
   PGA comparison, M-T, epicenter distribution, and focal depth charts;
   auto-detects CEIC catalog CSV
4. **Document rendering** — `render_docx.py` converts all chapters to a
   properly formatted Word document with inline bold/italic, auto-numbered
   tables and figures, and missing-image placeholders
5. **Compliance check** — `check_compliance.py` scores each chapter against
   GB 17741-2025 requirements

The scripts **never call an LLM**; all generation is done by Hermes itself.

## Installation

This skill requires the full source repository (scripts + domain library):

```bash
# 1. Clone the skill repository
git clone https://github.com/Mark7766/report-anping.git
cd report-anping

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install as a Hermes skill (user-local)
mkdir -p ~/.hermes/skills/domain
cp -r . ~/.hermes/skills/domain/report-anping/
```

## When to Use

**Activate this skill when:**
- User explicitly requests a seismic safety evaluation report
  (keywords: 安评, 安全性评价, GB 17741, 地震评价报告)
- User provides an engineering project background and asks for a .docx report

**Do NOT activate when:**
- User only asks about GB 17741 standard content (answer directly)
- The project falls outside GB 17741-2025 scope (e.g., ordinary residential)
- User needs a quick seismic intensity lookup, not a full report

## Parameters

13 parameters collected through multi-turn dialogue, written to `params.json`:

| # | key | Label | Description | Example | Required |
|---|-----|-------|-------------|---------|----------|
| 1 | `name` | Project name | Full project name | `某核电站地震安全性评价` | ✅ |
| 2 | `level` | Work level | GB 17741-2025 level: I / II / III | `II` | ✅ |
| 3 | `engineering_type` | Engineering type | e.g. 核电站, 大坝, 高层建筑 | `核电站` | ✅ |
| 4 | `location` | Site address | Administrative location | `广东省某市某县` | ✅ |
| 5 | `coordinate_lon` | Longitude | WGS-84 decimal degrees | `114.06` | ✅ |
| 6 | `coordinate_lat` | Latitude | WGS-84 decimal degrees | `22.54` | ✅ |
| 7 | `building_height` | Building height | Maximum height in meters | `80` | ✅ |
| 8 | `construction_unit` | Owner | Construction entity full name | `某能源集团有限公司` | ✅ |
| 9 | `survey_unit` | Survey unit | Geotechnical survey organisation | `某勘察院` | ✅ |
| 10 | `evaluation_unit` | Evaluation unit | Report-issuing organisation | `某地震安评机构` | ✅ |
| 11 | `exceedance_probs` | Exceedance probabilities | JSON: e.g. `{"50_year":[10,5],"100_year":[2]}` | see example | ✅ |
| 12 | `boreholes` | Borehole data | Borehole parameters (optional) | `{}` | ⬜ |
| 13 | `report_date` | Report date | YYYY-MM format | `2026-05` | ✅ |

## Workflow

### Step 0 — Install dependencies
```bash
cd <project_dir>
pip install -r ~/.hermes/skills/domain/report-anping/requirements.txt
```

### Step 0b — Initialise workspace
```bash
python ~/.hermes/skills/domain/report-anping/scripts/init_project.py \
    --out-dir <project_dir>
cd <project_dir>
```

### Step 0c — View parameter list
```bash
python ~/.hermes/skills/domain/report-anping/scripts/show_params.py
```

### Step 1–13 — Collect parameters (multi-turn dialogue)
Ask the user for each parameter and write them all to `params.json`.

### Step 2 — Generate chapter prompts and write chapters
For each chapter (preface, chapter1–chapter10, appendix):
```bash
python ~/.hermes/skills/domain/report-anping/scripts/build_chapter_prompt.py \
    --chapter <chapter_id> --params params.json
```
Use the printed prompt to generate Markdown → save to `chapters/<NN>_<chapter_id>.md`.

### Step 3 — Generate figures
```bash
python ~/.hermes/skills/domain/report-anping/scripts/generate_figures.py \
    --params params.json --out-dir assets/generated
```
Optional: place CEIC catalog CSV at `data/ceic_catalog.csv` for M-T and
distribution charts.

### Step 4 — Render .docx
```bash
python ~/.hermes/skills/domain/report-anping/scripts/render_docx.py \
    --params params.json --chapters chapters/ \
    --out exports/report_<project>_<date>.docx
```

### Step 5 — Compliance check
```bash
python ~/.hermes/skills/domain/report-anping/scripts/check_compliance.py \
    --report exports/report_<project>_<date>.docx --level <level>
```
Tell the user the report path and compliance score.

## Common Pitfalls

- **Image not found**: only reference images under `assets/generated/`. Do not
  reference borehole diagrams or structural drawings (not auto-generated).
- **CEIC catalog**: auto-detected at `data/ceic_catalog.csv` (relative to
  `project_dir`, not skill root). Export from CEIC with columns: longitude,
  latitude, magnitude, depth, datetime.
- **Relative paths**: always run scripts with `cwd = <project_dir>`, not the
  skill root.
- **Chapter ordering**: filenames must start with a numeric prefix
  (`01_preface.md`, `02_chapter1.md`) to ensure correct .docx order.

## Verification Checklist

- [ ] All 13 parameters present in `params.json`
- [ ] `chapters/` contains at least preface + chapter1 through chapter10
- [ ] `exports/report.docx` file size > 0 bytes
- [ ] `check_compliance.py` returns 0 `error`-level findings
- [ ] Report word count is 60,000–80,000 characters for a Level II report
- [ ] Report file renamed to include project name and date
  (e.g. `exports/report_YYYYMMDD.docx`)
- [ ] All image paths are **relative paths** (`~` expansion and absolute paths
  cause issues on some systems)
