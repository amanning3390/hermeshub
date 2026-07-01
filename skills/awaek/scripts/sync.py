#!/usr/bin/env python3
import argparse
import json
import re
import sys

import db


X_BOOKMARK_PAGE_SIZE = 100


def load_json_source(args):
    if args.input_file:
        with open(args.input_file, "r", encoding="utf-8") as f:
            return json.load(f)

    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            return json.loads(raw)

    return None


def extract_json(text):
    decoder = json.JSONDecoder()
    starts = [m.start() for m in re.finditer(r"[\[{]", text)]
    for start in starts:
        try:
            obj, _ = decoder.raw_decode(text[start:])
            return obj
        except json.JSONDecodeError:
            continue
    return None


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def first_string(record, keys):
    for key in keys:
        value = deep_get(record, key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, (int, float)):
            return str(value)
    return None


def deep_get(record, dotted):
    current = record
    for part in dotted.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def normalize_record(record):
    text = first_string(
        record,
        [
            "text",
            "full_text",
            "content",
            "tweet.text",
            "tweet.full_text",
            "data.text",
            "data.full_text",
            "node.text",
            "legacy.full_text",
            "legacy.text",
            "note_tweet.text",
        ],
    )
    tweet_id = first_string(
        record,
        [
            "tweet_id",
            "tweet.id",
            "data.id",
            "id",
            "rest_id",
            "node.id",
            "legacy.id_str",
            "edit_history_tweet_ids.0",
        ],
    )
    url = first_string(record, ["url", "tweet.url", "data.url", "expanded_url"])
    author_username = first_string(
        record,
        [
            "author_username",
            "username",
            "user.username",
            "author.username",
            "tweet.author.username",
            "core.user_results.result.legacy.screen_name",
        ],
    )
    author_name = first_string(
        record,
        [
            "author_name",
            "name",
            "user.name",
            "author.name",
            "tweet.author.name",
            "core.user_results.result.legacy.name",
        ],
    )
    created_at = first_string(
        record,
        ["tweet_created_at", "created_at", "tweet.created_at", "data.created_at", "legacy.created_at"],
    )
    bookmarked_at = first_string(record, ["bookmarked_at", "saved_at"])

    if not url and tweet_id and author_username:
        url = f"https://x.com/{author_username}/status/{tweet_id}"
    elif not url and tweet_id:
        url = f"https://x.com/i/web/status/{tweet_id}"

    bookmark_id = tweet_id or url
    if not bookmark_id:
        return None

    return {
        "id": bookmark_id,
        "tweet_id": tweet_id,
        "url": url,
        "author_username": author_username,
        "author_name": author_name,
        "text": text or "",
        "tweet_created_at": created_at,
        "bookmarked_at": bookmarked_at,
        "raw_json": None,
        "links": extract_links(record),
    }


def extract_bookmarks(raw, limit=None):
    xurl_records = extract_xurl_bookmarks(raw, limit=limit)
    if xurl_records:
        return xurl_records

    seen = set()
    bookmarks = []
    for record in walk(raw):
        normalized = normalize_record(record)
        if not normalized:
            continue
        key = normalized["id"]
        if key in seen:
            continue
        # A useful bookmark must have text or at least a URL/ID for hydration.
        if not normalized.get("text") and not normalized.get("tweet_id"):
            continue
        seen.add(key)
        bookmarks.append(normalized)
        if limit and len(bookmarks) >= limit:
            break
    return bookmarks


def extract_xurl_bookmarks(raw, limit=None):
    pages = []
    if isinstance(raw, dict) and raw.get("source") == "xurl":
        pages = raw.get("pages") or []
    elif isinstance(raw, dict) and ("data" in raw or "includes" in raw):
        pages = [raw]
    if not pages:
        return []

    records = []
    seen = set()
    for page in pages:
        users = {}
        for user in ((page.get("includes") or {}).get("users") or []):
            if user.get("id"):
                users[user["id"]] = user
        for tweet in page.get("data") or []:
            tweet_id = tweet.get("id")
            if not tweet_id or tweet_id in seen:
                continue
            seen.add(tweet_id)
            author = users.get(tweet.get("author_id"), {})
            text = extract_tweet_text(tweet)
            username = author.get("username")
            url = f"https://x.com/{username}/status/{tweet_id}" if username else f"https://x.com/i/web/status/{tweet_id}"
            records.append(
                {
                    "id": tweet_id,
                    "tweet_id": tweet_id,
                    "url": url,
                    "author_username": username,
                    "author_name": author.get("name"),
                    "text": text,
                    "tweet_created_at": tweet.get("created_at"),
                    "bookmarked_at": None,
                    "raw_json": None,
                    "links": extract_links(tweet),
                }
            )
            if limit and len(records) >= limit:
                return records
    return records


def extract_tweet_text(tweet):
    note_text = deep_get(tweet, "note_tweet.text")
    if isinstance(note_text, str) and note_text.strip():
        return note_text.strip()
    text = tweet.get("text")
    return text.strip() if isinstance(text, str) else ""


def extract_links(record):
    links = []
    seen = set()
    candidates = []
    entities = record.get("entities") if isinstance(record, dict) else None
    note_entities = deep_get(record, "note_tweet.entities")
    if isinstance(entities, dict):
        candidates.extend(entities.get("urls") or [])
    if isinstance(note_entities, dict):
        candidates.extend(note_entities.get("urls") or [])

    for item in candidates:
        if not isinstance(item, dict):
            continue
        url = item.get("expanded_url") or item.get("url")
        if not isinstance(url, str) or not url.strip() or url in seen:
            continue
        seen.add(url)
        links.append(
            {
                "url": item.get("url"),
                "expanded_url": item.get("expanded_url") or item.get("url"),
                "display_url": item.get("display_url"),
            }
        )
    for url in extract_text_links(record):
        if url in seen:
            continue
        seen.add(url)
        links.append({"url": url, "expanded_url": url, "display_url": url.removeprefix("https://")[:80]})
    return links


def extract_text_links(record):
    text_parts = []
    for value in [
        first_string(record, ["text", "full_text", "content", "data.text", "legacy.full_text"]),
        deep_get(record, "note_tweet.text"),
    ]:
        if isinstance(value, str):
            text_parts.append(value)
    text = "\n".join(text_parts)
    if not text:
        return []

    matches = re.findall(
        r"(?i)\b(?:https?://)?(?:[a-z0-9-]+\.)+(?:com|org|io|xyz|site)(?:/[^\s)\]>\"']*)?",
        text,
    )
    links = []
    seen = set()
    for match in matches:
        url = match.rstrip(".,;:")
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        if url not in seen:
            seen.add(url)
            links.append(url)
    return links


def page_meta(raw):
    pages = []
    if isinstance(raw, dict) and raw.get("source") == "xurl":
        pages = raw.get("pages") or []
    elif isinstance(raw, dict):
        pages = [raw]
    meta = {}
    for page in pages:
        if isinstance(page, dict) and isinstance(page.get("meta"), dict):
            meta = page["meta"]
    return {
        "result_count": meta.get("result_count"),
        "next_token": meta.get("next_token"),
        "previous_token": meta.get("previous_token"),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--source", choices=["auto", "input"], default="auto")
    parser.add_argument("--page-size", type=int, default=X_BOOKMARK_PAGE_SIZE)
    parser.add_argument("--input-file")
    parser.add_argument("--raw-output", action="store_true")
    args = parser.parse_args()

    raw = load_json_source(args)
    source = "input"
    command = None
    if raw is not None and args.source not in ("auto", "input"):
        print(
            json.dumps(
                {"ok": False, "error": "source_conflict", "message": "--input-file/stdin/env JSON can only be used with --source auto or --source input."},
                indent=2,
            )
        )
        sys.exit(2)

    if raw is None:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "no_input_json",
                    "message": "Pass xurl bookmark JSON through stdin or --input-file.",
                },
                indent=2,
            )
        )
        sys.exit(2)

    if args.raw_output:
        print(json.dumps(raw, indent=2))
        return

    bookmarks = extract_bookmarks(raw, args.limit)
    upsert = db.upsert_bookmarks(bookmarks)
    with_text = sum(1 for b in bookmarks if b.get("text"))
    with_url = sum(1 for b in bookmarks if b.get("url") or b.get("tweet_id"))
    meta = page_meta(raw)
    payload = {
        "ok": True,
        "source": source,
        "command": command,
        "fetched_normalized": len(bookmarks),
        "records_with_text": with_text,
        "records_with_url_or_tweet_id": with_url,
        "page_meta": meta,
        "next_token": meta.get("next_token"),
        "upsert": upsert,
        "db": db.stats(),
    }
    if len(bookmarks) == 0:
        payload["warning"] = "No bookmark records could be normalized from the response."
    elif with_text == 0:
        payload["warning"] = "Bookmark IDs were found, but no tweet text was found. Hydration is required."
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
