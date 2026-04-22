#!/usr/bin/env python3
"""Enroll or update a voiceprint from a speaker label in a transcription.

POST /api/voiceprints/enroll
    form: tr_id, speaker_label, speaker_name, speaker_id(optional)
Response: {"action": "created"|"updated", "speaker_id": "..."}

Important pitfall
-----------------
``speaker_label`` must be the raw pyannote label (e.g. ``SPEAKER_00``),
NOT the display name. Use the ``segment.speaker_label`` field from
``fetch_result`` output.
"""

from __future__ import annotations

import argparse
import re
import sys
from typing import Any, Dict, List

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    report_exception,
    t,
)


SPEAKER_LABEL_RE = re.compile(r"^SPEAKER_\d+$")


def diagnose_speaker_label(label: str) -> List[str]:
    hints: List[str] = []
    if not label:
        hints.append(t("enroll_label_warn_title"))
        hints.append(t("enroll_label_warn_body"))
        return hints
    if not SPEAKER_LABEL_RE.match(label):
        hints.append(t("enroll_label_warn_title"))
        hints.append(t("enroll_label_warn_body"))
    return hints


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Enroll or update a voiceprint from a transcription segment label."
    )
    add_common_args(parser)
    parser.add_argument(
        "--tr-id",
        required=True,
        help="Transcription job ID.",
    )
    parser.add_argument(
        "--speaker-label",
        required=True,
        help="Raw pyannote speaker label from the transcription (e.g. SPEAKER_00).",
    )
    parser.add_argument(
        "--speaker-name",
        required=True,
        help="Display name to assign to this speaker.",
    )
    parser.add_argument(
        "--speaker-id",
        default=None,
        help="Existing voiceprint ID (when provided, updates instead of creating).",
    )
    args = parser.parse_args()

    # Diagnose speaker_label up front — this is the most common pitfall.
    label_hints = diagnose_speaker_label(args.speaker_label)
    if label_hints:
        print("", file=sys.stderr)
        for h in label_hints:
            print(h, file=sys.stderr)
        print("", file=sys.stderr)
        if not SPEAKER_LABEL_RE.match(args.speaker_label):
            # Fatal: do not submit wrong label
            print_failure_report(
                target="POST /api/voiceprints/enroll",
                status=None,
                error=f"invalid speaker_label: {args.speaker_label!r}",
                extra_hints=[t("enroll_label_warn_title")],
            )
            return 1

    form: Dict[str, Any] = {
        "tr_id": args.tr_id,
        "speaker_label": args.speaker_label,
        "speaker_name": args.speaker_name,
    }
    if args.speaker_id:
        form["speaker_id"] = args.speaker_id

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        print(f"{t('sending')}: POST /api/voiceprints/enroll", file=sys.stderr)
        resp = client.post("/api/voiceprints/enroll", data=form)
    except ValueError as exc:
        print_failure_report(
            target="POST /api/voiceprints/enroll",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target="POST /api/voiceprints/enroll",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target="POST /api/voiceprints/enroll",
            exc=exc,
            client=client,
        )
        return 1

    if not isinstance(resp, dict):
        print_failure_report(
            target="POST /api/voiceprints/enroll",
            status=None,
            error="unexpected response shape",
        )
        print(resp, file=sys.stderr)
        return 1

    action = resp.get("action", "unknown")
    speaker_id = resp.get("speaker_id", "")
    msg = t("enroll_created") if action == "created" else t("enroll_updated")
    print(msg)
    print(f"   speaker_id: {speaker_id}")
    print(f"   action:     {action}")
    print(t("done"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
