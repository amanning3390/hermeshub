#!/usr/bin/env python3
"""
Top News — Data Fetcher

Fetches news from RSS feeds and APIs, outputs unified JSON format.

Usage:
  python fetch_news.py --sources sources.json --output raw_news.json
  python fetch_news.py --sources sources.json --output raw_news.json --limit 50
"""

import argparse
import datetime
import json
import logging
import os
import sys
import time
import urllib.request
import ssl
import xml.etree.ElementTree as ET
from typing import Any

logger = logging.getLogger("top-news")

DEFAULT_LIMIT = 50
REQUEST_TIMEOUT = 15
USER_AGENT = "TopNews/1.0 (RSS Aggregator)"


# ---------------------------------------------------------------------------
# RSS / Atom Parser
# ---------------------------------------------------------------------------

def fetch_rss(url: str, source_name: str, limit: int = 20) -> list[dict]:
    """Fetch and parse RSS/Atom feed, return list of article dicts."""
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT, context=ctx) as resp:
            data = resp.read()
    except Exception as e:
        logger.warning(f"Failed to fetch {source_name} ({url}): {e}")
        return []

    articles = []
    try:
        root = ET.fromstring(data)

        # RSS 2.0
        items = root.findall(".//item")
        if items:
            for item in items[:limit]:
                articles.append(_parse_rss_item(item, source_name))
            return articles

        # Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall(".//atom:entry", ns)
        if entries:
            for entry in entries[:limit]:
                articles.append(_parse_atom_entry(entry, ns, source_name))
            return articles

        # Atom without namespace
        entries = root.findall(".//entry")
        if entries:
            for entry in entries[:limit]:
                articles.append(_parse_atom_entry_no_ns(entry, source_name))
            return articles

    except ET.ParseError as e:
        logger.warning(f"Failed to parse {source_name} feed: {e}")

    return articles


def _get_text(element, tag: str) -> str:
    el = element.find(tag)
    return (el.text or "").strip() if el is not None else ""


def _parse_rss_item(item, source_name: str) -> dict:
    return {
        "title": _get_text(item, "title"),
        "url": _get_text(item, "link"),
        "summary": _get_text(item, "description")[:500],
        "published": _get_text(item, "pubDate"),
        "source": source_name,
        "fetched_at": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(),
    }


def _parse_atom_entry(entry, ns: dict, source_name: str) -> dict:
    link_el = entry.find("atom:link", ns)
    url = link_el.get("href", "") if link_el is not None else ""
    return {
        "title": _get_text(entry, "atom:title"),
        "url": url,
        "summary": _get_text(entry, "atom:summary")[:500],
        "published": _get_text(entry, "atom:updated"),
        "source": source_name,
        "fetched_at": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(),
    }


def _parse_atom_entry_no_ns(entry, source_name: str) -> dict:
    link_el = entry.find("link")
    url = link_el.get("href", "") if link_el is not None else ""
    return {
        "title": _get_text(entry, "title"),
        "url": url,
        "summary": _get_text(entry, "summary")[:500],
        "published": _get_text(entry, "updated"),
        "source": source_name,
        "fetched_at": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(),
    }


# ---------------------------------------------------------------------------
# Hacker News API
# ---------------------------------------------------------------------------

def fetch_hackernews(limit: int = 20) -> list[dict]:
    """Fetch top stories from Hacker News API."""
    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request(
            "https://hacker-news.firebaseio.com/v0/topstories.json",
            headers={"User-Agent": USER_AGENT}
        )
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT, context=ctx) as resp:
            story_ids = json.loads(resp.read())[:limit]
    except Exception as e:
        logger.warning(f"Failed to fetch HN top stories: {e}")
        return []

    articles = []
    for sid in story_ids:
        try:
            req = urllib.request.Request(
                f"https://hacker-news.firebaseio.com/v0/item/{sid}.json",
                headers={"User-Agent": USER_AGENT}
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT, context=ctx) as resp:
                item = json.loads(resp.read())
            if item and item.get("title"):
                articles.append({
                    "title": item["title"],
                    "url": item.get("url", f"https://news.ycombinator.com/item?id={sid}"),
                    "summary": "",
                    "published": datetime.datetime.fromtimestamp(item.get("time", 0)).isoformat(),
                    "source": "Hacker News",
                    "score": item.get("score", 0),
                    "fetched_at": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(),
                })
        except Exception:
            continue

    return articles


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_sources(sources_path: str) -> list[dict]:
    """Load source configuration.

    Expected format:
    [
      {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "type": "rss"},
      {"name": "Hacker News", "type": "hackernews"},
      ...
    ]
    """
    with open(sources_path, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_all(sources: list[dict], limit_per_source: int = 20) -> list[dict]:
    """Fetch news from all configured sources."""
    all_articles = []

    for src in sources:
        src_type = src.get("type", "rss")
        src_name = src.get("name", "Unknown")

        logger.info(f"Fetching: {src_name} ({src_type})")

        if src_type == "hackernews":
            articles = fetch_hackernews(limit=limit_per_source)
        elif src_type in ("rss", "atom"):
            url = src.get("url", "")
            if not url:
                logger.warning(f"No URL for source {src_name}, skipping")
                continue
            articles = fetch_rss(url, src_name, limit=limit_per_source)
        else:
            logger.warning(f"Unknown source type '{src_type}' for {src_name}")
            continue

        logger.info(f"  → {len(articles)} articles from {src_name}")
        all_articles.extend(articles)

    return all_articles


def main():
    parser = argparse.ArgumentParser(description="Top News — Data Fetcher")
    parser.add_argument("--sources", required=True, help="Path to sources config JSON")
    parser.add_argument("--output", required=True, help="Output path for raw news JSON")
    parser.add_argument("--limit", type=int, default=20, help="Max articles per source (default: 20)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    sources = load_sources(args.sources)
    articles = fetch_all(sources, limit_per_source=args.limit)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print(f"Fetched {len(articles)} articles from {len(sources)} sources")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
