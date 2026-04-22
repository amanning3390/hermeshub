#!/usr/bin/env python3
"""Submit an audio file to VoScript for transcription.

Usage:
    python submit_audio.py --file path/to/audio.m4a \
        [--language zh] [--min-speakers 1] [--max-speakers 4] \
        [--denoise-model default] [--snr-threshold 10.0] \
        [--no-repeat-ngram 3]

On success, prints the job ID. If the server detects that this audio has
already been transcribed (SHA-256 deduplication), it returns the existing
result immediately and this script prints a dedup notice.

Exit codes:
    0  success
    1  error (network / server / validation)
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import sys
from pathlib import Path
from typing import List

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    print_json,
    report_exception,
    t,
)


AUDIO_EXTS = {
    ".mp3",
    ".m4a",
    ".wav",
    ".flac",
    ".ogg",
    ".oga",
    ".webm",
    ".aac",
    ".wma",
    ".opus",
    ".mp4",  # some m4a files are actually mp4 containers
    ".mov",  # audio extraction supported server-side
}

LARGE_FILE_BYTES = 500 * 1024 * 1024  # 500 MB


def diagnose_file(path: Path) -> List[str]:
    """Check an audio file for common issues. Returns hint strings."""
    hints: List[str] = []
    if not path.exists():
        hints.append(f"{t('file_missing')}: {path}")
        return hints
    if not path.is_file():
        hints.append(f"{t('file_missing')}: {path}")
        return hints
    if not os.access(path, os.R_OK):
        hints.append(f"{t('file_not_readable')}: {path}")
    try:
        size = path.stat().st_size
    except OSError:
        size = -1
    if size == 0:
        hints.append(t("file_empty"))
    elif size > LARGE_FILE_BYTES:
        hints.append(f"{t('file_size_warn')} ({size / (1024 * 1024):.1f} MB)")
    ext = path.suffix.lower()
    if ext and ext not in AUDIO_EXTS:
        hints.append(f"{t('file_ext_warn')}: {ext}")
    return hints


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Submit an audio file to VoScript for transcription.",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the audio file to transcribe.",
    )
    parser.add_argument(
        "--language",
        default=None,
        help="Optional language code hint (e.g. 'zh', 'en').",
    )
    parser.add_argument(
        "--min-speakers",
        type=int,
        default=None,
        help="Minimum speaker count hint.",
    )
    parser.add_argument(
        "--max-speakers",
        type=int,
        default=None,
        help="Maximum speaker count hint.",
    )
    parser.add_argument(
        "--denoise-model",
        default=None,
        help="Denoise model identifier (server-defined).",
    )
    parser.add_argument(
        "--snr-threshold",
        type=float,
        default=None,
        help="SNR threshold (dB) for denoise gating.",
    )
    parser.add_argument(
        "--no-repeat-ngram",
        type=int,
        default=None,
        help="no_repeat_ngram_size passed to the ASR decoder.",
    )
    add_common_args(parser)
    return parser


def main(argv: "list[str] | None" = None) -> int:
    args = build_parser().parse_args(argv)

    file_path = Path(args.file).expanduser()

    # Pre-flight file diagnostics
    file_hints = diagnose_file(file_path)
    fatal = (
        not file_path.exists()
        or not file_path.is_file()
        or file_path.stat().st_size == 0
        if file_path.exists()
        else True
    )
    if fatal:
        print_failure_report(
            target=f"submit_audio --file {file_path}",
            status=None,
            error=t("file_missing") if not file_path.exists() else t("file_empty"),
            extra_hints=file_hints,
        )
        return 1
    # Show non-fatal hints on stderr
    non_fatal_hints = [h for h in file_hints if h]
    if non_fatal_hints:
        print(t("hints_title"), file=sys.stderr)
        for h in non_fatal_hints:
            print(f"  • {h}", file=sys.stderr)

    form: "dict[str, object]" = {}
    if args.language is not None:
        form["language"] = args.language
    if args.min_speakers is not None:
        form["min_speakers"] = args.min_speakers
    if args.max_speakers is not None:
        form["max_speakers"] = args.max_speakers
    if args.denoise_model is not None:
        form["denoise_model"] = args.denoise_model
    if args.snr_threshold is not None:
        form["snr_threshold"] = args.snr_threshold
    if args.no_repeat_ngram is not None:
        form["no_repeat_ngram_size"] = args.no_repeat_ngram

    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        print(f"{t('uploading')}: {file_path.name}", file=sys.stderr)
        with file_path.open("rb") as fh:
            files = {"file": (file_path.name, fh, mime)}
            response = client.post("/api/transcribe", data=form, files=files)
    except ValueError as exc:
        print_failure_report(
            target="POST /api/transcribe",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target="POST /api/transcribe",
            exc=exc,
            client=client,
        )
        return 1
    except OSError as exc:
        print_failure_report(
            target=f"read {file_path}",
            status=None,
            error=f"{exc.__class__.__name__}: {exc}",
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target="POST /api/transcribe",
            exc=exc,
            client=client,
        )
        return 1

    if not isinstance(response, dict):
        print_failure_report(
            target="POST /api/transcribe",
            status=None,
            error="unexpected response shape",
        )
        print_json(response)
        return 1

    job_id = response.get("id", "<unknown>")
    status = response.get("status", "<unknown>")
    deduplicated = bool(response.get("deduplicated"))

    print("")
    if deduplicated:
        tr_id = None
        result = response.get("result")
        if isinstance(result, dict):
            tr_id = result.get("id")
        print(t("dedup_notice"))
        if tr_id:
            print(f"   tr_id: {tr_id}")
        print(f"   {t('job_id_label')}: {job_id}")
    else:
        print(t("job_queued"))
        print(f"   {t('job_id_label')}: {job_id}")

    print(f"   {t('status_label_short')}: {status}")
    print(f"{t('done')}")
    print("")
    print_json(response)
    return 0


if __name__ == "__main__":
    sys.exit(main())
