#!/usr/bin/env python3
"""List all transcription jobs stored on the VoScript server.

GET /api/transcriptions -> [{id, filename, created_at, segment_count, speaker_count}]
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
    ("filename", "文件名"),
    ("created_at", "创建时间"),
    ("segment_count", "片段数"),
    ("speaker_count", "说话人数"),
]

COLUMNS_EN = [
    ("id", "ID"),
    ("filename", "filename"),
    ("created_at", "created_at"),
    ("segment_count", "segments"),
    ("speaker_count", "speakers"),
]


def _columns() -> List[tuple]:
    from common import LANG

    return COLUMNS_ZH if LANG == "zh" else COLUMNS_EN


def _stringify(value: Any) -> str:
    if value is None:
        return "-"
    return str(value)


def _display_width(text: str) -> int:
    """Display width in terminal cells, treating CJK as 2."""
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
        print(t("tr_empty"))
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


def main() -> int:
    parser = argparse.ArgumentParser(
        description="List all transcription jobs on the VoScript server."
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
        data = client.get("/api/transcriptions")
    except ValueError as exc:
        print_failure_report(
            target="GET /api/transcriptions",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target="GET /api/transcriptions",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target="GET /api/transcriptions",
            exc=exc,
            client=client,
        )
        return 1

    if args.json:
        print_json(data)
        return 0

    if not isinstance(data, list):
        print_failure_report(
            target="GET /api/transcriptions",
            status=None,
            error="unexpected response shape (expected list)",
        )
        print_json(data)
        return 1

    _print_table(data)
    return 0


if __name__ == "__main__":
    sys.exit(main())
