#!/usr/bin/env python3
"""Fetch a completed VoScript transcription and print it in a readable form.

Usage:
    python fetch_result.py --tr-id tr_xxx [--show-words]

Prints each segment as:
    [HH:MM:SS.mmm - HH:MM:SS.mmm] speaker_name: text

Then prints a speaker_map summary and a note about similarity semantics.

Note:
    Similarity values in VoScript are AS-norm z-scores, NOT [0,1] probabilities.
    Higher z-score = more confident match against the cohort distribution.
"""

from __future__ import annotations

import argparse
import sys
from typing import Any, Dict, List, Tuple

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    format_hms,
    print_failure_report,
    print_json,
    report_exception,
    t,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Fetch and display a VoScript transcription result.",
    )
    parser.add_argument(
        "--tr-id",
        required=True,
        help="Transcription ID (format: tr_xxx).",
    )
    parser.add_argument(
        "--show-words",
        action="store_true",
        help="Include word-level alignment under each segment.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the raw JSON response instead of the formatted view.",
    )
    add_common_args(parser)
    return parser


def _segment_speaker(seg: Dict[str, Any], speaker_map: Dict[str, Any]) -> str:
    label = seg.get("speaker") or seg.get("speaker_label")
    if not label:
        return "unknown"
    mapped = speaker_map.get(label) if isinstance(speaker_map, dict) else None
    if isinstance(mapped, dict):
        return str(mapped.get("name") or mapped.get("speaker_id") or label)
    if isinstance(mapped, str):
        return mapped
    return str(label)


def _print_segments(result: Dict[str, Any], show_words: bool) -> None:
    segments = result.get("segments") or []
    speaker_map = result.get("speaker_map") or {}

    if not segments:
        print("(no segments in result)")
        return

    for seg in segments:
        start = format_hms(seg.get("start"))
        end = format_hms(seg.get("end"))
        speaker = _segment_speaker(seg, speaker_map)
        text = (seg.get("text") or "").strip()
        seg_id = seg.get("id")
        prefix = f"[{start} - {end}]"
        if seg_id is not None:
            prefix = f"#{seg_id} {prefix}"
        print(f"{prefix} {speaker}: {text}")

        if show_words:
            words = seg.get("words") or []
            for w in words:
                ws = format_hms(w.get("start"))
                we = format_hms(w.get("end"))
                token = (w.get("word") or w.get("text") or "").strip()
                print(f"    {ws}-{we} {token}")


def _speaker_summary_rows(
    result: Dict[str, Any],
) -> List[Tuple[str, str, str, str, str]]:
    """Build (label, name, speaker_id, similarity, segments) rows."""
    speaker_map = result.get("speaker_map") or {}
    segments = result.get("segments") or []

    # Count segments per label
    seg_counts: Dict[str, int] = {}
    for seg in segments:
        lbl = seg.get("speaker") or seg.get("speaker_label") or "unknown"
        seg_counts[str(lbl)] = seg_counts.get(str(lbl), 0) + 1

    rows: List[Tuple[str, str, str, str, str]] = []
    for label, info in speaker_map.items():
        if isinstance(info, dict):
            name = str(info.get("name") or "(unnamed)")
            sid_raw = info.get("speaker_id")
            sid = str(sid_raw) if sid_raw else t("speaker_not_enrolled")
            sim = info.get("similarity")
            sim_str = f"{sim:+.3f}" if isinstance(sim, (int, float)) else "-"
        else:
            name = str(info)
            sid = "-"
            sim_str = "-"
        rows.append(
            (
                str(label),
                name,
                sid,
                sim_str,
                str(seg_counts.get(str(label), 0)),
            )
        )
    return rows


def _print_speaker_map(result: Dict[str, Any]) -> None:
    speaker_map = result.get("speaker_map") or {}
    print("")
    if not speaker_map:
        print(f"{t('speaker_map_header')} {t('speaker_map_empty')}")
        return

    print(t("speaker_map_header"))
    headers = ("label", "name", "speaker_id", "similarity", "segments")
    rows = _speaker_summary_rows(result)
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    def _fmt(cells: Tuple[str, ...]) -> str:
        return "  ".join(c.ljust(widths[i]) for i, c in enumerate(cells))

    print("  " + _fmt(headers))
    print("  " + "  ".join("-" * w for w in widths))
    for row in rows:
        print("  " + _fmt(row))

    print("")
    print(t("as_norm_note"))


def main(argv: "list[str] | None" = None) -> int:
    args = build_parser().parse_args(argv)

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        result = client.get(f"/api/transcriptions/{args.tr_id}")
    except ValueError as exc:
        print_failure_report(
            target=f"GET /api/transcriptions/{args.tr_id}",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target=f"GET /api/transcriptions/{args.tr_id}",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target=f"GET /api/transcriptions/{args.tr_id}",
            exc=exc,
            client=client,
        )
        return 1

    if not isinstance(result, dict):
        print_failure_report(
            target=f"GET /api/transcriptions/{args.tr_id}",
            status=None,
            error="unexpected response shape",
        )
        return 1

    if args.json:
        print_json(result)
        return 0

    filename = result.get("filename") or "(unknown)"
    created = result.get("created_at") or "-"
    print(f"🎯 Transcription: {args.tr_id}")
    print(f"  filename:   {filename}")
    print(f"  created_at: {created}")
    seg_count = len(result.get("segments") or [])
    spk_count = len(result.get("speaker_map") or {})
    print(f"  {t('segments_count')}:   {seg_count}")
    print(f"  {t('speakers_count')}:   {spk_count}")
    print("")

    _print_segments(result, show_words=args.show_words)
    _print_speaker_map(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
