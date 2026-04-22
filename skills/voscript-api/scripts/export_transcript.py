#!/usr/bin/env python3
"""Export a VoScript transcription as SRT / TXT / JSON.

Usage:
    python export_transcript.py --tr-id tr_xxx \
        [--format srt|txt|json] [--output path/to/file]

If ``--output`` is omitted, the exported content is printed to stdout.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    report_exception,
    t,
)


SUPPORTED_FORMATS = ("srt", "txt", "json")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Export a VoScript transcription in srt/txt/json format.",
    )
    parser.add_argument(
        "--tr-id",
        required=True,
        help="Transcription ID (format: tr_xxx).",
    )
    parser.add_argument(
        "--format",
        choices=SUPPORTED_FORMATS,
        default="srt",
        help="Export format (default: srt).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output file path. If omitted, content is printed to stdout.",
    )
    add_common_args(parser)
    return parser


def main(argv: "list[str] | None" = None) -> int:
    args = build_parser().parse_args(argv)

    if args.format not in SUPPORTED_FORMATS:
        print_failure_report(
            target=f"export_transcript --format {args.format}",
            status=None,
            error=t("format_invalid"),
        )
        return 1

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        print(
            f"{t('sending')}: GET /api/export/{args.tr_id}?format={args.format}",
            file=sys.stderr,
        )
        content, _suggested = client.download(
            f"/api/export/{args.tr_id}",
            params={"format": args.format},
        )
    except ValueError as exc:
        print_failure_report(
            target=f"GET /api/export/{args.tr_id}",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target=f"GET /api/export/{args.tr_id}",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target=f"GET /api/export/{args.tr_id}",
            exc=exc,
            client=client,
        )
        return 1

    if args.output:
        out_path = Path(args.output).expanduser()
        try:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(content)
        except OSError as exc:
            print_failure_report(
                target=f"write {out_path}",
                status=None,
                error=f"{exc.__class__.__name__}: {exc}",
            )
            return 1
        print(t("wrote_bytes", n=len(content), path=out_path))
        return 0

    try:
        sys.stdout.write(content.decode("utf-8"))
    except UnicodeDecodeError:
        sys.stdout.buffer.write(content)
    if not content.endswith(b"\n"):
        sys.stdout.write("\n")
    print(f"{t('done')} ({len(content)} bytes)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
