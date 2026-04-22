#!/usr/bin/env python3
"""Manage a single voiceprint: get / rename / delete.

- get:    GET    /api/voiceprints/{speaker_id}
- rename: PUT    /api/voiceprints/{speaker_id}/name   form: name
- delete: DELETE /api/voiceprints/{speaker_id}

``delete`` is irreversible. When running in an interactive terminal the
script prompts for explicit ``yes`` confirmation; use ``--yes`` to skip.
"""

from __future__ import annotations

import argparse
import sys

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    print_json,
    report_exception,
    t,
)


def _confirm_delete(speaker_id: str, assume_yes: bool) -> bool:
    """Return True if the user confirms deletion."""
    print("", file=sys.stderr)
    print(t("delete_warn"), file=sys.stderr)
    if assume_yes:
        return True
    if not sys.stdin.isatty():
        # Non-interactive — refuse to delete without --yes.
        print(
            "stdin is not a TTY; pass --yes to confirm non-interactively.",
            file=sys.stderr,
        )
        return False
    try:
        answer = input(t("delete_confirm_prompt", sid=speaker_id))
    except EOFError:
        return False
    return answer.strip().lower() in ("yes", "y")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Manage a single voiceprint: get / rename / delete."
    )
    add_common_args(parser)
    parser.add_argument(
        "--action",
        required=True,
        choices=["get", "rename", "delete"],
        help="Operation to perform.",
    )
    parser.add_argument(
        "--speaker-id",
        required=True,
        help="Voiceprint ID.",
    )
    parser.add_argument(
        "--name",
        default=None,
        help="New name (required when --action rename).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip interactive confirmation for --action delete.",
    )
    args = parser.parse_args()

    if args.action == "rename" and not args.name:
        print_failure_report(
            target="manage_voiceprint --action rename",
            status=None,
            error="--name is required when --action rename",
        )
        return 1

    client = None
    target = f"/api/voiceprints/{args.speaker_id}"

    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)

        if args.action == "get":
            resp = client.get(target)
            print_json(resp)
            return 0

        if args.action == "rename":
            resp = client.put(
                f"{target}/name",
                data={"name": args.name},
            )
            _ = resp  # unused
            print(t("rename_done", sid=args.speaker_id, name=args.name))
            print(t("done"))
            return 0

        if args.action == "delete":
            if not _confirm_delete(args.speaker_id, assume_yes=args.yes):
                print(t("delete_aborted"), file=sys.stderr)
                return 1
            resp = client.delete(target)
            _ = resp
            print(t("delete_done", sid=args.speaker_id))
            print(t("done"))
            return 0

    except ValueError as exc:
        print_failure_report(
            target=target,
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target=target,
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target=target,
            exc=exc,
            client=client,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
