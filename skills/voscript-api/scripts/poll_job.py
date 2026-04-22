#!/usr/bin/env python3
"""Poll a VoScript transcription job until it completes or fails.

Usage:
    python poll_job.py --job-id tr_xxx [--interval 5.0] [--timeout 600]

Status progression (from the VoScript FSM):
    queued -> converting -> denoising -> transcribing -> identifying -> completed

Prints one line per status change. Exits 0 on ``completed``, 1 otherwise.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from typing import List, Optional

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    report_exception,
    t,
)


JOB_ID_RE = re.compile(r"^tr_[A-Za-z0-9_-]{1,64}$")


STAGE_KEYS = {
    "queued": "stage_queued",
    "converting": "stage_converting",
    "denoising": "stage_denoising",
    "transcribing": "stage_transcribing",
    "identifying": "stage_identifying",
    "completed": "stage_completed",
    "failed": "stage_failed",
    "error": "stage_error",
}


STAGE_ORDER = [
    "queued",
    "converting",
    "denoising",
    "transcribing",
    "identifying",
    "completed",
]


def diagnose_job_id(job_id: str) -> List[str]:
    """Validate the shape of a VoScript job id."""
    hints: List[str] = []
    if not job_id:
        hints.append(t("job_id_format_bad"))
        return hints
    if not JOB_ID_RE.match(job_id):
        hints.append(t("job_id_format_bad"))
    return hints


def progress_bar(status: str) -> str:
    """Return an ASCII progress bar reflecting the current stage."""
    if status in ("failed", "error"):
        return "[" + "x" * len(STAGE_ORDER) + "]"
    try:
        idx = STAGE_ORDER.index(status)
    except ValueError:
        return "[" + "?" * len(STAGE_ORDER) + "]"
    filled = "#" * (idx + 1)
    rest = "-" * (len(STAGE_ORDER) - idx - 1)
    return f"[{filled}{rest}]"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Poll a VoScript transcription job until completion.",
    )
    parser.add_argument(
        "--job-id",
        required=True,
        help="Job ID returned by submit_audio (format: tr_xxx).",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Polling interval in seconds (default: 5.0).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Max total wait time in seconds (default: 600).",
    )
    add_common_args(parser)
    return parser


def main(argv: "list[str] | None" = None) -> int:
    args = build_parser().parse_args(argv)

    job_hints = diagnose_job_id(args.job_id)
    if job_hints and not JOB_ID_RE.match(args.job_id):
        print_failure_report(
            target=f"poll_job --job-id {args.job_id}",
            status=None,
            error=t("job_id_format_bad"),
            extra_hints=job_hints,
        )
        return 1

    client = None
    try:
        client = build_client_with_diagnostics(args)
    except ValueError as exc:
        print_failure_report(
            target="poll_job (init)",
            status=None,
            error=str(exc),
        )
        return 1

    print(f"{t('connecting')}: {client.url}", file=sys.stderr)
    print(f"{t('polling')}: {args.job_id}", file=sys.stderr)

    deadline = time.monotonic() + max(1, args.timeout)
    interval = max(0.1, args.interval)
    last_status: Optional[str] = None

    while True:
        try:
            job = client.get(f"/api/jobs/{args.job_id}")
        except VoScriptError as exc:
            report_exception(
                target=f"GET /api/jobs/{args.job_id}",
                exc=exc,
                client=client,
            )
            return 1
        except Exception as exc:  # noqa: BLE001
            report_exception(
                target=f"GET /api/jobs/{args.job_id}",
                exc=exc,
                client=client,
            )
            return 1

        if not isinstance(job, dict):
            print_failure_report(
                target=f"GET /api/jobs/{args.job_id}",
                status=None,
                error="unexpected response shape",
            )
            return 1

        status = str(job.get("status", "unknown"))
        if status != last_status:
            stage_key = STAGE_KEYS.get(status)
            hint = t(stage_key) if stage_key else status
            bar = progress_bar(status)
            tr_id = None
            result = job.get("result")
            if isinstance(result, dict):
                tr_id = result.get("id")
            if status == "completed":
                line = f"{bar} ✅ {hint}"
                if tr_id:
                    line += f"  tr_id={tr_id}"
                print(line)
            elif status in ("failed", "error"):
                line = f"{bar} ❌ {hint}"
                print(line)
            else:
                print(f"{bar} {hint}")
            last_status = status

        if status == "completed":
            print(t("done"))
            return 0
        if status in {"failed", "error"}:
            err = job.get("error") or "(no error message returned)"
            print("", file=sys.stderr)
            print(f"❌ {err}", file=sys.stderr)
            print(f"   {t('timeout_advice')}", file=sys.stderr)
            return 1

        if time.monotonic() >= deadline:
            print("", file=sys.stderr)
            print(f"❌ {t('timeout_reached')} ({args.timeout}s)", file=sys.stderr)
            print(f"   last status: {status}", file=sys.stderr)
            print(f"   {t('timeout_advice')}", file=sys.stderr)
            return 1

        time.sleep(interval)


if __name__ == "__main__":
    sys.exit(main())
