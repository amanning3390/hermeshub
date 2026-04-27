#!/usr/bin/env python3
"""
Tests for top-news scripts.

Run:
  python -m pytest test_top_news.py -v              # unit tests only
  python -m pytest test_top_news.py -v --network    # include network tests
"""

import json
import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(__file__))
import fetch_news
import rank_and_dedup


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_articles():
    return [
        {"title": "AI Breakthrough in 2026", "url": "https://example.com/1", "summary": "Big news about AI", "published": "2026-04-27T08:00:00", "source": "TechCrunch", "fetched_at": "2026-04-27T10:00:00"},
        {"title": "AI Breakthrough in 2026!", "url": "https://example.com/2", "summary": "Same news different source", "published": "2026-04-27T07:00:00", "source": "The Verge", "fetched_at": "2026-04-27T10:00:00"},
        {"title": "Stock Market Hits Record High", "url": "https://example.com/3", "summary": "Markets are up", "published": "2026-04-27T09:00:00", "source": "Bloomberg", "fetched_at": "2026-04-27T10:00:00"},
        {"title": "New Python Release", "url": "https://example.com/4", "summary": "Python 3.15 is out", "published": "2026-04-27T06:00:00", "source": "Hacker News", "fetched_at": "2026-04-27T10:00:00"},
        {"title": "Climate Summit Results", "url": "https://example.com/5", "summary": "Global leaders agree", "published": "2026-04-27T05:00:00", "source": "BBC", "fetched_at": "2026-04-27T10:00:00"},
    ]


@pytest.fixture
def empty_tracking():
    return {"items": []}


@pytest.fixture
def tracking_with_streak():
    return {
        "items": [
            {"title_normalized": "ai breakthrough in 2026", "title": "AI Breakthrough in 2026", "first_seen": "2026-04-25", "last_seen": "2026-04-26", "days_count": 2},
        ]
    }


# ---------------------------------------------------------------------------
# Dedup Tests
# ---------------------------------------------------------------------------

class TestDedup:
    def test_removes_similar_titles(self, sample_articles):
        result = rank_and_dedup.dedup_articles(sample_articles)
        titles = [a["title"] for a in result]
        # "AI Breakthrough in 2026" and "AI Breakthrough in 2026!" should dedup
        assert len(result) == 4

    def test_keeps_different_titles(self, sample_articles):
        result = rank_and_dedup.dedup_articles(sample_articles)
        sources = {a["source"] for a in result}
        assert "Bloomberg" in sources
        assert "BBC" in sources


class TestTitleSimilarity:
    def test_identical(self):
        assert rank_and_dedup.titles_similar("Hello World", "Hello World")

    def test_similar_with_punctuation(self):
        assert rank_and_dedup.titles_similar("AI Breakthrough in 2026", "AI Breakthrough in 2026!")

    def test_different(self):
        assert not rank_and_dedup.titles_similar("AI Breakthrough", "Stock Market Crash")

    def test_empty(self):
        assert not rank_and_dedup.titles_similar("", "")


# ---------------------------------------------------------------------------
# Ranking Tests
# ---------------------------------------------------------------------------

class TestRanking:
    def test_ranking_returns_all(self, sample_articles, empty_tracking):
        deduped = rank_and_dedup.dedup_articles(sample_articles)
        ranked = rank_and_dedup.rank_articles(deduped, empty_tracking)
        assert len(ranked) == 4

    def test_ranking_order_by_score(self, sample_articles, empty_tracking):
        deduped = rank_and_dedup.dedup_articles(sample_articles)
        ranked = rank_and_dedup.rank_articles(deduped, empty_tracking)
        scores = [a["_score"] for a in ranked]
        assert scores == sorted(scores, reverse=True)

    def test_streak_bonus(self, sample_articles, tracking_with_streak):
        deduped = rank_and_dedup.dedup_articles(sample_articles)
        ranked = rank_and_dedup.rank_articles(deduped, tracking_with_streak)
        ai_article = next(a for a in ranked if "AI" in a["title"])
        assert ai_article["_streak"] == 2


# ---------------------------------------------------------------------------
# Tracking Tests
# ---------------------------------------------------------------------------

class TestTracking:
    def test_update_new_articles(self, sample_articles, empty_tracking):
        rank_and_dedup.update_tracking(sample_articles[:2], empty_tracking)
        assert len(empty_tracking["items"]) >= 1

    def test_update_existing_streak(self, tracking_with_streak):
        articles = [{"title": "AI Breakthrough in 2026", "url": "x", "source": "test"}]
        rank_and_dedup.update_tracking(articles, tracking_with_streak)
        item = tracking_with_streak["items"][0]
        assert item["days_count"] == 3

    def test_save_and_load(self, tmp_path, empty_tracking):
        path = str(tmp_path / "tracking.json")
        empty_tracking["items"].append({
            "title_normalized": "test", "title": "Test",
            "first_seen": "2026-04-27", "last_seen": "2026-04-27", "days_count": 1
        })
        rank_and_dedup.save_tracking(path, empty_tracking)
        loaded = rank_and_dedup.load_tracking(path)
        assert len(loaded["items"]) == 1


# ---------------------------------------------------------------------------
# Normalize Tests
# ---------------------------------------------------------------------------

class TestNormalize:
    def test_lowercase(self):
        assert rank_and_dedup.normalize_title("Hello WORLD") == "hello world"

    def test_strip_punctuation(self):
        assert rank_and_dedup.normalize_title("Hello, World!") == "hello world"

    def test_collapse_whitespace(self):
        assert rank_and_dedup.normalize_title("Hello   World") == "hello world"


# ---------------------------------------------------------------------------
# Network Tests (requires --network flag)
# ---------------------------------------------------------------------------

def pytest_addoption(parser):
    parser.addoption("--network", action="store_true", default=False, help="Run network tests")


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--network"):
        skip = pytest.mark.skip(reason="Need --network flag")
        for item in items:
            if "network" in item.keywords:
                item.add_marker(skip)


@pytest.mark.network
class TestFetchNetwork:
    def test_fetch_hackernews(self):
        articles = fetch_news.fetch_hackernews(limit=3)
        assert len(articles) > 0
        assert articles[0]["title"]
        assert articles[0]["source"] == "Hacker News"

    def test_fetch_rss(self):
        articles = fetch_news.fetch_rss(
            "https://feeds.bbci.co.uk/news/rss.xml",
            "BBC News",
            limit=3
        )
        assert len(articles) > 0
        assert articles[0]["source"] == "BBC News"
