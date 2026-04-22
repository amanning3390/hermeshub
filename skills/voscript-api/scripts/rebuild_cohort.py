#!/usr/bin/env python3
"""Rebuild the voiceprint cohort (background set for AS-norm scoring).

POST /api/voiceprints/rebuild-cohort
Response: {"cohort_size": N, "skipped": M, "saved_to": "path"}

When to use
-----------
Run this after enrolling 10+ speakers. AS-norm scoring needs a cohort of
imposter embeddings to compute z-scores; larger cohorts (~50 or more) give
more reliable similarity values.
"""

from __future__ import annotations

import argparse
import sys

from common import (
    VoScriptError,
    add_common_args,
    build_client_with_diagnostics,
    print_failure_report,
    report_exception,
    t,
)


MIN_COHORT = 10
OPTIMAL_COHORT = 50


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rebuild the voiceprint cohort for AS-norm scoring."
    )
    add_common_args(parser)
    args = parser.parse_args()

    print(t("cohort_when_to_use"), file=sys.stderr)

    client = None
    try:
        client = build_client_with_diagnostics(args)
        print(f"{t('connecting')}: {client.url}", file=sys.stderr)
        print(f"{t('sending')}: POST /api/voiceprints/rebuild-cohort", file=sys.stderr)
        resp = client.post("/api/voiceprints/rebuild-cohort")
    except ValueError as exc:
        print_failure_report(
            target="POST /api/voiceprints/rebuild-cohort",
            status=None,
            error=str(exc),
        )
        return 1
    except VoScriptError as exc:
        report_exception(
            target="POST /api/voiceprints/rebuild-cohort",
            exc=exc,
            client=client,
        )
        return 1
    except Exception as exc:  # noqa: BLE001
        report_exception(
            target="POST /api/voiceprints/rebuild-cohort",
            exc=exc,
            client=client,
        )
        return 1

    if not isinstance(resp, dict):
        print_failure_report(
            target="POST /api/voiceprints/rebuild-cohort",
            status=None,
            error="unexpected response shape",
        )
        print(resp, file=sys.stderr)
        return 1

    cohort_size = resp.get("cohort_size", 0)
    skipped = resp.get("skipped", 0)
    saved_to = resp.get("saved_to", "")

    print(t("cohort_rebuilt"))
    print(
        f"   {t('cohort_size_label')}: {cohort_size} (min={MIN_COHORT}, optimal={OPTIMAL_COHORT}+)"
    )
    print(f"   {t('cohort_skipped_label')}: {skipped}")
    print(f"   {t('cohort_saved_label')}: {saved_to}")

    # Quality hint based on size
    if isinstance(cohort_size, int):
        if cohort_size < MIN_COHORT:
            print("")
            print(t("cohort_below_min"))
        elif cohort_size < OPTIMAL_COHORT:
            print("")
            print(t("cohort_below_optimal"))
        else:
            print("")
            print(t("cohort_ok"))

    print(t("done"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
