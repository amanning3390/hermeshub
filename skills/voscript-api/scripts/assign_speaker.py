#!/usr/bin/env python3
"""Assign a transcription segment to a named speaker.

PUT /api/transcriptions/{tr_id}/segments/{seg_id}/speaker
    form: speaker_name, speaker_id(optional)
Response: {"ok": true}
"""

from __future__ import annotations

import argparse
import sys
from typing import Any, Dict

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    report_exception,
    t,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Assign a transcription segment to a named speaker."
    )
    add_common_args(parser)
    parser.add_argument(
        "--tr-id",
        required=True,
        help="Transcription job ID.",
    )
    parser.add_argument(
        "--seg-id",
        required=True,
        type=int,
        help="Segment ID (integer).",
    )
    parser.add_argument(
        "--speaker-name",
        required=True,
        help="Display name to assign to this segment.",
    )
    parser.add_argument(
        "--speaker-id",
        default=None,
        help="Optional voiceprint ID to link.",
    )
    args = parser.parse_args()

    form: Dict[str, Any] = {"speaker_name": args.speaker_name}
    if args.speaker_id:
        form["speaker_id"] = args.speaker_id

    path = f"/api/transcriptions/{args.tr_id}/segments/{args.seg_id}/speaker"

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        print(f"{t('sending')}: PUT {path}", file=sys.stderr)
        resp = client.put(path, data=form)
    except ValueError as exc:
        print_failure_report(
            target=f"PUT {path}",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target=f"PUT {path}",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target=f"PUT {path}",
            exc=exc,
            client=client,
        )
        return 1

    if not (isinstance(resp, dict) and resp.get("ok")):
        print_failure_report(
            target=f"PUT {path}",
            status=None,
            error="server did not return ok=true",
        )
        print(resp, file=sys.stderr)
        return 1

    print(t("assign_done", sid=args.seg_id, name=args.speaker_name))
    print(t("done"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
