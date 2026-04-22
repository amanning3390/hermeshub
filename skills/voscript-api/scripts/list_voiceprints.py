#!/usr/bin/env python3
"""List all voiceprints stored on the VoScript server.

GET /api/voiceprints ->
    [{id, name, sample_count, sample_spread, created_at, updated_at}]
"""

from __future__ import annotations

import argparse
import sys
from typing import Any, Dict, List

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    print_json,
    report_exception,
    t,
)


COLUMNS_ZH = [
    ("id", "ID"),
    ("name", "名字"),
    ("sample_count", "样本数"),
    ("sample_spread", "样本离散度"),
    ("created_at", "创建时间"),
    ("updated_at", "更新时间"),
]

COLUMNS_EN = [
    ("id", "ID"),
    ("name", "name"),
    ("sample_count", "samples"),
    ("sample_spread", "spread"),
    ("created_at", "created_at"),
    ("updated_at", "updated_at"),
]


def _columns() -> List[tuple]:
    from common import LANG

    return COLUMNS_ZH if LANG == "zh" else COLUMNS_EN


def _stringify(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def _display_width(text: str) -> int:
    width = 0
    for ch in text:
        code = ord(ch)
        if (
            0x1100 <= code <= 0x115F
            or 0x2E80 <= code <= 0x303E
            or 0x3041 <= code <= 0x33FF
            or 0x3400 <= code <= 0x4DBF
            or 0x4E00 <= code <= 0x9FFF
            or 0xA000 <= code <= 0xA4CF
            or 0xAC00 <= code <= 0xD7A3
            or 0xF900 <= code <= 0xFAFF
            or 0xFE30 <= code <= 0xFE4F
            or 0xFF00 <= code <= 0xFF60
            or 0xFFE0 <= code <= 0xFFE6
        ):
            width += 2
        else:
            width += 1
    return width


def _pad(text: str, target_width: int) -> str:
    gap = target_width - _display_width(text)
    if gap <= 0:
        return text
    return text + " " * gap


def _print_table(rows: List[Dict[str, Any]]) -> None:
    cols = _columns()
    if not rows:
        print(t("vp_empty"))
        return

    widths = []
    for key, header in cols:
        max_value_width = max(
            (_display_width(_stringify(row.get(key))) for row in rows),
            default=0,
        )
        widths.append(max(_display_width(header), max_value_width))

    header_line = "  ".join(
        _pad(header, widths[i]) for i, (_, header) in enumerate(cols)
    )
    sep_line = "  ".join("-" * widths[i] for i in range(len(cols)))
    print(header_line)
    print(sep_line)

    for row in rows:
        cells = []
        for i, (key, _) in enumerate(cols):
            cells.append(_pad(_stringify(row.get(key)), widths[i]))
        print("  ".join(cells))


def _print_warnings(rows: List[Dict[str, Any]]) -> None:
    """Emit per-row voiceprint quality hints."""
    notes: List[str] = []
    for row in rows:
        sid = row.get("id") or row.get("speaker_id") or "?"
        sample_count = row.get("sample_count")
        sample_spread = row.get("sample_spread")
        if isinstance(sample_count, int) and sample_count == 1:
            notes.append(f"  • [{sid}] {t('vp_single_sample')}")
        if isinstance(sample_spread, (int, float)) and sample_spread > 0.2:
            notes.append(
                f"  • [{sid}] {t('vp_spread_high')} "
                f"(sample_spread={sample_spread:.3f})"
            )
    if notes:
        print("")
        print(t("hints_title"))
        for n in notes:
            print(n)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="List all voiceprints on the VoScript server."
    )
    add_common_args(parser)
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON instead of a formatted table.",
    )
    args = parser.parse_args()

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        data = client.get("/api/voiceprints")
    except ValueError as exc:
        print_failure_report(
            target="GET /api/voiceprints",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target="GET /api/voiceprints",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target="GET /api/voiceprints",
            exc=exc,
            client=client,
        )
        return 1

    if args.json:
        print_json(data)
        return 0

    if not isinstance(data, list):
        print_failure_report(
            target="GET /api/voiceprints",
            status=None,
            error="unexpected response shape (expected list)",
        )
        print_json(data)
        return 1

    _print_table(data)
    _print_warnings(data)
    return 0


if __name__ == "__main__":
    sys.exit(main())
