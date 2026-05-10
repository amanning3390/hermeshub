# report-anping — Hermes Skill

> WeChat-driven seismic safety evaluation report generator, compliant with **GB 17741-2025**.

[![CI](https://github.com/Mark7766/report-anping/actions/workflows/ci.yml/badge.svg)](https://github.com/Mark7766/report-anping/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.3.0-blue)](https://github.com/Mark7766/report-anping)

## What It Does

Through multi-turn WeChat dialogue, Hermes collects 13 engineering project parameters, then orchestrates deterministic Python scripts to:

1. Build chapter-level prompts → Hermes LLM writes Markdown
2. Generate charts: response spectrum, PGA comparison, M-T, epicenter distribution, focal depth
3. Render a fully formatted Word (.docx) report — inline bold/italic, auto-numbered tables & figures
4. Run a GB 17741-2025 compliance check and report the score

The scripts **never call an LLM**; only Hermes does.

## Installation

```bash
git clone https://github.com/Mark7766/report-anping.git
cd report-anping
pip install -r requirements.txt
mkdir -p ~/.hermes/skills/domain
cp -r . ~/.hermes/skills/domain/report-anping/
```

Or install from HermesHub once merged:

```bash
hermes skills install github:amanning3390/hermeshub/skills/report-anping
```

## Requirements

- Python 3.11+
- `python-docx`, `matplotlib>=3.8`, `markdown`, `Pillow`
- Optional: CEIC earthquake catalog CSV (for M-T and distribution charts)

## Source Repository

**[github.com/Mark7766/report-anping](https://github.com/Mark7766/report-anping)**

- 163 tests, 79% coverage
- Ruff lint + format enforced by CI
- GB 17741-2025 knowledge base in `lib/data/standards/`

## Author

[Mark7766](https://github.com/Mark7766)

## License

MIT
