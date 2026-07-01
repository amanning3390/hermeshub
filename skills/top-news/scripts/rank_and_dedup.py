#!/usr/bin/env python3
"""
Top News — Rank and Deduplicate

Takes raw fetched news, deduplicates against recent history,
ranks by relevance/recency, and outputs top N items with streak badges.

Usage:
  python rank_and_dedup.py --input raw_news.json --tracking tracking.json --output ranked_news.json --top 10
"""

import argparse
import datetime
import json
import os
import re
import sys
from typing import Any


def normalize_title(title: str) -> str:
    """Normalize title for dedup comparison."""
    title = title.lower().strip()
    title = re.sub(r'[^\w\s]', '', title)
    title = re.sub(r'\s+', ' ', title)
    return title


def titles_similar(a: str, b: str, threshold: float = 0.6) -> bool:
    """Simple word-overlap similarity check."""
    words_a = set(normalize_title(a).split())
    words_b = set(normalize_title(b).split())
    if not words_a or not words_b:
        return False
    overlap = len(words_a & words_b)
    shorter = min(len(words_a), len(words_b))
    return (overlap / shorter) >= threshold


def load_tracking(tracking_path: str) -> dict:
    """Load tracking data (recent 7-day pushed news).

    Format:
    {
      "items": [
        {"title_normalized": "...", "title": "...", "first_seen": "2026-04-25", "last_seen": "2026-04-27", "days_count": 3}
      ]
    }
    """
    if not os.path.exists(tracking_path):
        return {"items": []}
    with open(tracking_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_tracking(tracking_path: str, tracking: dict):
    """Save tracking data, pruning items older than 7 days."""
    cutoff = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
    tracking["items"] = [
        item for item in tracking["items"]
        if item.get("last_seen", "") >= cutoff
    ]
    os.makedirs(os.path.dirname(tracking_path) or ".", exist_ok=True)
    with open(tracking_path, "w", encoding="utf-8") as f:
        json.dump(tracking, f, ensure_ascii=False, indent=2)


def compute_streak(article: dict, tracking: dict) -> int:
    """Check if article title matches any tracked item, return streak days."""
    norm = normalize_title(article["title"])
    for item in tracking["items"]:
        if titles_similar(article["title"], item["title"]):
            return item["days_count"]
    return 0


def update_tracking(selected_articles: list[dict], tracking: dict) -> dict:
    """Update tracking with today's selected articles."""
    today = datetime.date.today().isoformat()

    for article in selected_articles:
        matched = False
        for item in tracking["items"]:
            if titles_similar(article["title"], item["title"]):
                item["last_seen"] = today
                item["days_count"] += 1
                matched = True
                break
        if not matched:
            tracking["items"].append({
                "title_normalized": normalize_title(article["title"]),
                "title": article["title"],
                "first_seen": today,
                "last_seen": today,
                "days_count": 1,
            })

    return tracking


def rank_articles(articles: list[dict], tracking: dict) -> list[dict]:
    """Rank articles by score. Higher = more relevant.

    Scoring:
    - Recency: newer articles score higher (0-100)
    - Streak bonus: trending items get a boost (streak_days * 10)
    """
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    for article in articles:
        score = 0.0

        # Recency score (0-100): articles from last 6 hours get highest
        try:
            pub = datetime.datetime.fromisoformat(article.get("published", "").replace("Z", "+00:00").replace("+00:00", ""))
            hours_ago = (now - pub.replace(tzinfo=None)).total_seconds() / 3600
            score += max(0, 100 - hours_ago * 2)
        except (ValueError, TypeError):
            score += 30  # unknown time, moderate score

        # Streak bonus
        streak = compute_streak(article, tracking)
        if streak >= 2:
            score += streak * 10
        article["_score"] = score
        article["_streak"] = streak

    articles.sort(key=lambda x: x["_score"], reverse=True)
    return articles


def dedup_articles(articles: list[dict]) -> list[dict]:
    """Remove duplicate articles (similar titles)."""
    seen = []
    result = []
    for article in articles:
        is_dup = False
        for s in seen:
            if titles_similar(article["title"], s):
                is_dup = True
                break
        if not is_dup:
            result.append(article)
            seen.append(article["title"])
    return result


def main():
    parser = argparse.ArgumentParser(description="Top News — Rank and Deduplicate")
    parser.add_argument("--input", required=True, help="Path to raw news JSON from fetch_news.py")
    parser.add_argument("--tracking", required=True, help="Path to tracking JSON (read + write)")
    parser.add_argument("--output", required=True, help="Output path for ranked news JSON")
    parser.add_argument("--top", type=int, default=10, help="Number of top articles to output (default: 10)")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        raw_articles = json.load(f)

    tracking = load_tracking(args.tracking)

    # Dedup within fetched batch
    deduped = dedup_articles(raw_articles)

    # Rank
    ranked = rank_articles(deduped, tracking)

    # Take top N with source diversity (max 5 per source)
    top = []
    source_counts: dict[str, int] = {}
    for article in ranked:
        src = article.get("source", "unknown")
        if source_counts.get(src, 0) >= 5:
            continue
        top.append(article)
        source_counts[src] = source_counts.get(src, 0) + 1
        if len(top) >= args.top:
            break

    # Update tracking with selected articles
    tracking = update_tracking(top, tracking)
    save_tracking(args.tracking, tracking)

    # Clean internal fields for output
    for article in top:
        article["streak_days"] = article.pop("_streak", 0)
        article.pop("_score", None)

    # Output
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(top, f, ensure_ascii=False, indent=2)

    print(f"Selected {len(top)} articles from {len(raw_articles)} raw ({len(deduped)} after dedup)")
    print(f"Output: {args.output}")

    # Print streak summary
    streaks = [a for a in top if a["streak_days"] >= 2]
    if streaks:
        streak_strs = [a["title"][:40] + " (" + str(a["streak_days"]) + "d)" for a in streaks]
        print("Streaks: " + ", ".join(streak_strs))


if __name__ == "__main__":
    main()
