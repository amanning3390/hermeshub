#!/usr/bin/env python3
import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
NEUTRAL_DATA_DIR = Path("~/.awaek/data").expanduser()
LEGACY_HERMES_DATA_DIR = Path("~/.hermes/awaek/data").expanduser()


def default_data_dir():
    legacy_db = LEGACY_HERMES_DATA_DIR / "awaek.db"
    if legacy_db.exists():
        return LEGACY_HERMES_DATA_DIR
    return NEUTRAL_DATA_DIR


DATA_DIR = default_data_dir()
DB_PATH = DATA_DIR / "awaek.db"


SCHEMA = """
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  tweet_id TEXT,
  url TEXT,
  author_username TEXT,
  author_name TEXT,
  text TEXT NOT NULL,
  tweet_created_at TEXT,
  bookmarked_at TEXT,
  raw_json TEXT,
  synced_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts
USING fts5(
  text,
  author_username,
  content='bookmarks',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT
);

CREATE TABLE IF NOT EXISTS bookmark_topics (
  bookmark_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  confidence REAL NOT NULL,
  PRIMARY KEY (bookmark_id, topic_id)
);

CREATE TABLE IF NOT EXISTS learned_topic_candidates (
  term TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  promoted_topic_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmark_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookmark_id TEXT NOT NULL,
  url TEXT NOT NULL,
  expanded_url TEXT,
  display_url TEXT,
  domain TEXT,
  hydration_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(bookmark_id, url)
);

CREATE TABLE IF NOT EXISTS bookmark_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookmark_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  summary TEXT,
  role TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(bookmark_id, chunk_index)
);

CREATE VIRTUAL TABLE IF NOT EXISTS bookmark_chunks_fts
USING fts5(
  text,
  summary,
  role,
  content='bookmark_chunks',
  content_rowid='id'
);
"""


SAFE_LINK_DOMAINS = {
    "arxiv.org",
    "docs.github.com",
    "github.com",
    "gist.github.com",
    "medium.com",
    "mirror.xyz",
    "notion.site",
    "open.substack.com",
    "substack.com",
    "vercel.com",
    "x.com",
}

SAFE_LINK_SUFFIXES = (
    ".github.io",
    ".gitbook.io",
    ".medium.com",
    ".substack.com",
)


TOPIC_DEFS = {
    "marketing": ("Marketing", None, ["marketing", "promotion", "promote", "promoting", "gtm", "go to market"]),
    "marketing.reddit": ("Reddit Marketing", "marketing", ["reddit", "subreddit", "karma", "moderator"]),
    "marketing.x": ("X Marketing", "marketing", ["tweet", "tweets", "twitter", " x ", "thread", "hook", "timeline"]),
    "marketing.linkedin": ("LinkedIn Marketing", "marketing", ["linkedin", "professional network"]),
    "marketing.launch": ("Launch", "marketing", ["launch", "waitlist", "beta", "announce", "release", "launch week"]),
    "marketing.copywriting": ("Copywriting", "marketing", ["copywriting", "hook", "headline", "cta", "landing page"]),
    "marketing.positioning": ("Positioning", "marketing", ["positioning", "category", "differentiation", "pain point"]),
    "marketing.growth": ("Growth", "marketing", ["growth", "acquisition", "retention", "activation", "funnel", "viral", "referral"]),
    "startup": ("Startup", None, ["startup", "founder", "company", "business"]),
    "startup.product": ("Product", "startup", ["product", "roadmap", "feature", "ux", "user feedback"]),
    "startup.fundraising": ("Fundraising", "startup", ["fundraising", "investor", "pitch", "term sheet", "valuation"]),
    "startup.pricing": ("Pricing", "startup", ["pricing", "subscription", "plan", "tier", "monetization"]),
    "startup.distribution": ("Distribution", "startup", ["distribution", "channel", "partnership", "community"]),
    "startup.pmf": ("Product Market Fit", "startup", ["product market fit", "pmf", "retention", "pull"]),
    "tech_products": ("Tech Products", None, ["software", "developer", "platform", "product"]),
    "tech_products.architecture": ("Architecture", "tech_products", ["architecture", "system design", "scalability"]),
    "tech_products.api": ("API", "tech_products", ["api", "endpoint", "sdk", "webhook"]),
    "tech_products.database": ("Database", "tech_products", ["database", "sqlite", "postgres", "index", "query"]),
    "tech_products.security": ("Security", "tech_products", ["security", "auth", "permission", "credential", "oauth"]),
    "tech_products.devtools": ("Developer Tools", "tech_products", ["devtool", "developer tool", "cli", "mcp", "sdk"]),
    "ai": ("AI", None, ["ai", "llm", "model", "prompt", "inference"]),
    "ai.agents": ("AI Agents", "ai", ["agent", "agents", "autonomous", "tool use", "workflow"]),
    "ai.llms": ("LLMs", "ai", ["llm", "claude", "gpt", "gemini", "model"]),
    "ai.prompting": ("Prompting", "ai", ["prompt", "prompting", "system prompt", "context"]),
    "ai.mcp": ("MCP", "ai", ["mcp", "model context protocol", "server", "tool server"]),
    "ai.automation": ("Automation", "ai", ["automation", "workflow", "task", "agentic"]),
    "health": ("Health", None, ["health", "fitness", "sleep", "nutrition", "supplement"]),
    "health.fitness": ("Fitness", "health", ["fitness", "workout", "gym", "lifting", "cardio"]),
    "health.sleep": ("Sleep", "health", ["sleep", "circadian", "melatonin", "sleep quality", "deep sleep"]),
    "health.nutrition": ("Nutrition", "health", ["nutrition", "protein", "diet", "calorie"]),
    "health.supplements": ("Supplements", "health", ["supplement", "vitamin", "creatine", "magnesium"]),
    "lifestyle": ("Lifestyle", None, ["lifestyle", "life", "personal"]),
    "lifestyle.productivity": ("Productivity", "lifestyle", ["productivity", "focus", "deep work", "calendar"]),
    "lifestyle.habits": ("Habits", "lifestyle", ["habit", "routine", "discipline"]),
    "lifestyle.travel": ("Travel", "lifestyle", ["travel", "hotel", "flight", "visa"]),
    "web3": ("Web3", None, ["web3", "onchain", "wallet", "smart contract"]),
    "web3.wallets": ("Wallets", "web3", ["wallet", "wallets", "seed phrase", "signing"]),
    "web3.x402": ("x402", "web3", ["x402", "402 payment", "http 402"]),
    "web3.onchain_apps": ("Onchain Apps", "web3", ["onchain app", "dapp", "smart contract"]),
    "web3.agent_payments": ("Agent Payments", "web3", ["agent payment", "agent commerce", "x402", "wallet-native"]),
    "crypto": ("Crypto", None, ["crypto", "token", "defi", "chain"]),
    "crypto.solana": ("Solana", "crypto", ["solana", "spl", "anchor"]),
    "crypto.base": ("Base", "crypto", ["base", "base chain"]),
    "crypto.bitcoin": ("Bitcoin", "crypto", ["bitcoin", "btc", "lightning"]),
    "crypto.tokens": ("Tokens", "crypto", ["token", "tokens", "tokenomics", "memecoin"]),
    "crypto.defi": ("DeFi", "crypto", ["defi", "liquidity", "yield", "amm"]),
    "fintech": ("Fintech", None, ["fintech", "banking", "payments", "compliance"]),
    "fintech.payments": ("Payments", "fintech", ["payment", "payments", "checkout", "settlement"]),
    "fintech.banking": ("Banking", "fintech", ["bank", "banking", "account", "neobank"]),
    "fintech.compliance": ("Compliance", "fintech", ["compliance", "kyc", "aml", "regulation"]),
    "fintech.stablecoins": ("Stablecoins", "fintech", ["stablecoin", "usdc", "usdt"]),
}

STOP_TERMS = {
    "about", "after", "again", "also", "because", "before", "being", "their",
    "a", "an", "as", "at", "by", "if", "in", "is", "it", "of", "on", "or",
    "the", "and", "for", "you", "are", "but", "not", "to",
    "there", "these", "those", "thing", "things", "using", "where", "which",
    "while", "would", "could", "should", "with", "from", "that", "this",
    "have", "your", "they", "them", "what", "when", "will", "just",
    "into", "only", "once", "over", "same", "than", "then", "very",
    "here", "away", "came", "come", "does", "done", "down", "even",
    "ever", "every", "gets", "give", "goes", "going", "good", "keep",
    "know", "last", "look", "made", "make", "many", "more", "most",
    "much", "need", "next", "part", "real", "right", "said", "some",
    "take", "tell", "want", "well", "work", "worked", "works", "year",
    "years", "actually", "anything", "building", "attention", "accounts",
    "already", "another", "around", "assume", "behind", "better", "came",
    "clear", "different", "during", "early", "enough", "exactly", "first",
    "inside", "instead", "little", "matter", "matters", "months", "people",
    "person", "power", "really", "reason", "simple", "single", "small",
    "something", "starts", "strong", "through", "today", "together", "turn",
    "turns", "use", "used", "version", "whole",
    "useful", "examples", "example", "combine", "without", "custom", "pattern",
    "patterns", "response", "connect", "context", "tools", "workflow", "workflows",
    "posts", "read", "like", "start", "show", "specific", "before", "state",
    "awaek", "bookmark", "bookmarks", "saved", "saves", "save", "tell",
    "help", "using", "based", "says", "find", "post", "question", "answer",
}

SPECIAL_CANDIDATE_TERMS = {
    "assistant", "watchlist", "watchlists", "workflow", "workflows",
    "telegram", "linkedin", "saas", "github", "notion", "reddit",
    "voice", "algorithm",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    con = connect()
    try:
        con.executescript(SCHEMA)
        if backfill_existing_bookmark_derivatives(con):
            rebuild_fts(con)
        con.commit()
    finally:
        con.close()


def validate_fts5():
    con = sqlite3.connect(":memory:")
    try:
        con.execute("CREATE VIRTUAL TABLE t USING fts5(x)")
        con.execute("INSERT INTO t VALUES (?)", ("hello marketing agent",))
        rows = con.execute("SELECT x FROM t WHERE t MATCH 'marketing'").fetchall()
        return bool(rows)
    finally:
        con.close()


def set_state(con, key, value):
    con.execute(
        "INSERT INTO sync_state(key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, str(value)),
    )


def get_state(con, key):
    row = con.execute("SELECT value FROM sync_state WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def rebuild_fts(con):
    con.execute("INSERT INTO bookmarks_fts(bookmarks_fts) VALUES('rebuild')")
    con.execute("INSERT INTO bookmark_chunks_fts(bookmark_chunks_fts) VALUES('rebuild')")


def classify_text(text):
    haystack = (text or "").lower()
    matches = []
    for topic_id, (_name, parent_id, keywords) in TOPIC_DEFS.items():
        score = 0
        for keyword in keywords:
            if keyword_matches(haystack, keyword):
                score += 1
        if score:
            confidence = min(1.0, 0.35 + (score * 0.15))
            matches.append((topic_id, confidence))
            if parent_id:
                matches.append((parent_id, max(0.3, confidence - 0.15)))
    if not matches:
        matches.append(("general", 0.25))
    merged = {}
    for topic_id, confidence in matches:
        merged[topic_id] = max(confidence, merged.get(topic_id, 0))
    return sorted(merged.items(), key=lambda item: item[1], reverse=True)


def keyword_matches(text, keyword):
    keyword = (keyword or "").strip().lower()
    if not keyword:
        return False
    if any(char.isalnum() for char in keyword):
        pattern = r"(?<![a-z0-9_])" + re.escape(keyword) + r"(?![a-z0-9_])"
        return re.search(pattern, text) is not None
    return keyword in text


def ensure_topics(con):
    rows = [("general", "General", None)]
    rows.extend((topic_id, name, parent_id) for topic_id, (name, parent_id, _keywords) in TOPIC_DEFS.items())
    con.executemany(
        "INSERT INTO topics(id, name, parent_id) VALUES (?, ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET name=excluded.name, parent_id=excluded.parent_id",
        rows,
    )


def assign_topics(con, bookmark_id, text):
    ensure_topics(con)
    con.execute("DELETE FROM bookmark_topics WHERE bookmark_id = ?", (bookmark_id,))
    con.executemany(
        "INSERT INTO bookmark_topics(bookmark_id, topic_id, confidence) VALUES (?, ?, ?)",
        [(bookmark_id, topic_id, confidence) for topic_id, confidence in classify_text(text)],
    )
    learn_topic_candidates(con, text)


def learn_topic_candidates(con, text):
    tokens = [
        token.lower()
        for token in re.findall(r"[A-Za-z][A-Za-z0-9_+-]{3,}", text or "")
        if token.lower() not in STOP_TERMS
    ]
    phrases = extract_candidate_phrases(text)
    known_terms = {keyword.lower() for _tid, (_name, _parent, keywords) in TOPIC_DEFS.items() for keyword in keywords}
    candidates = []
    for token in sorted(set(tokens + phrases)):
        if token in known_terms:
            continue
        if not is_distinctive_candidate(token):
            continue
        candidates.append((token, now_iso()))
    con.executemany(
        """
        INSERT INTO learned_topic_candidates(term, count, updated_at)
        VALUES (?, 1, ?)
        ON CONFLICT(term) DO UPDATE SET
          count=count + 1,
          updated_at=excluded.updated_at
        """,
        candidates[:30],
    )


def is_distinctive_candidate(token):
    if token in SPECIAL_CANDIDATE_TERMS:
        return True
    if " " in token:
        return True
    if len(token) >= 8:
        return True
    if any(char.isdigit() for char in token):
        return True
    if any(char in token for char in ["-", "_", "+"]):
        return True
    return False


def extract_candidate_phrases(text):
    clean = " ".join((text or "").lower().split())
    phrases = []
    patterns = [
        r"\b[a-z0-9+-]+ ai\b",
        r"\b[a-z0-9+-]+ agent\b",
        r"\b[a-z0-9+-]+ agents\b",
        r"\b[a-z0-9+-]+ automation\b",
        r"\b[a-z0-9+-]+ automations\b",
        r"\b[a-z0-9+-]+ content\b",
        r"\b[a-z0-9+-]+ workflow\b",
        r"\b[a-z0-9+-]+ workflows\b",
        r"\b[a-z0-9+-]+ system\b",
        r"\b[a-z0-9+-]+ systems\b",
        r"\b[a-z0-9+-]+ loop\b",
        r"\b[a-z0-9+-]+ loops\b",
        r"\b[a-z0-9+-]+ strategy\b",
        r"\b[a-z0-9+-]+ engine\b",
        r"\b[a-z0-9+-]+ search\b",
    ]
    for pattern in patterns:
        for match in re.findall(pattern, clean):
            parts = match.split()
            if any(part in STOP_TERMS for part in parts):
                continue
            phrases.append(match)
    return phrases[:20]


def learned_topic_summary(limit=12, min_count=2):
    candidates = learned_candidates(limit=limit, min_count=min_count)
    grouped = []
    for item in candidates:
        term = item["term"]
        parent = infer_candidate_parent(term)
        grouped.append({**item, "suggested_parent": parent})
    return grouped


def infer_candidate_parent(term):
    term = (term or "").lower()
    checks = [
        ("ai", ["ai", "agent", "agents", "assistant", "prompt", "automation"]),
        ("marketing", ["content", "audience", "growth", "follower", "linkedin", "twitter", "tweet", "x search", "algorithm"]),
        ("startup", ["business", "customer", "pricing", "distribution", "saas", "product"]),
        ("tech_products", ["api", "developer", "github", "repo", "system", "workflow"]),
        ("fintech", ["payment", "checkout", "bank", "card"]),
        ("web3", ["wallet", "onchain", "x402"]),
    ]
    for parent, terms in checks:
        if any(value in term for value in terms):
            return parent
    return "general"


def upsert_bookmarks(bookmarks):
    init_db()
    con = connect()
    inserted = 0
    updated = 0
    skipped = 0
    synced_at = now_iso()
    try:
        for b in bookmarks:
            text = (b.get("text") or "").strip()
            if not text:
                skipped += 1
                continue

            bookmark_id = b.get("id") or b.get("tweet_id") or b.get("url")
            if not bookmark_id:
                skipped += 1
                continue

            existed = con.execute(
                "SELECT 1 FROM bookmarks WHERE id = ?", (bookmark_id,)
            ).fetchone()
            con.execute(
                """
                INSERT INTO bookmarks(
                  id, tweet_id, url, author_username, author_name, text,
                  tweet_created_at, bookmarked_at, raw_json, synced_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  tweet_id=excluded.tweet_id,
                  url=excluded.url,
                  author_username=excluded.author_username,
                  author_name=excluded.author_name,
                  text=excluded.text,
                  tweet_created_at=excluded.tweet_created_at,
                  bookmarked_at=excluded.bookmarked_at,
                  raw_json=excluded.raw_json,
                  synced_at=excluded.synced_at
                """,
                (
                    bookmark_id,
                    b.get("tweet_id"),
                    b.get("url"),
                    b.get("author_username"),
                    b.get("author_name"),
                    text,
                    b.get("tweet_created_at"),
                    b.get("bookmarked_at"),
                    json.dumps(b.get("raw_json"), ensure_ascii=False) if b.get("raw_json") else None,
                    synced_at,
                ),
            )
            if existed:
                updated += 1
            else:
                inserted += 1
            assign_topics(con, bookmark_id, text)
            upsert_bookmark_links(con, bookmark_id, b.get("links") or [])
            upsert_bookmark_chunks(con, bookmark_id, text)

        rebuild_fts(con)
        set_state(con, "last_sync_at", synced_at)
        set_state(con, "last_sync_inserted", inserted)
        set_state(con, "last_sync_updated", updated)
        set_state(con, "last_sync_skipped", skipped)
        con.commit()
        return {"inserted": inserted, "updated": updated, "skipped": skipped}
    finally:
        con.close()


def upsert_bookmark_chunks(con, bookmark_id, text):
    con.execute("DELETE FROM bookmark_chunks WHERE bookmark_id = ?", (bookmark_id,))
    now = now_iso()
    chunks = chunk_text(text)
    rows = []
    for index, chunk in enumerate(chunks):
        rows.append(
            (
                bookmark_id,
                index,
                chunk,
                summarize_chunk(chunk),
                infer_chunk_role(chunk),
                estimate_tokens(chunk),
                now,
            )
        )
    con.executemany(
        """
        INSERT INTO bookmark_chunks(
          bookmark_id, chunk_index, text, summary, role, token_estimate, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def backfill_existing_bookmark_derivatives(con):
    changed = False
    rows = con.execute(
        """
        SELECT b.id, b.text
        FROM bookmarks b
        WHERE NOT EXISTS (
          SELECT 1 FROM bookmark_chunks bc WHERE bc.bookmark_id = b.id
        )
        """
    ).fetchall()
    for row in rows:
        upsert_bookmark_chunks(con, row["id"], row["text"])
        changed = True

    topic_rows = con.execute(
        """
        SELECT b.id, b.text
        FROM bookmarks b
        WHERE NOT EXISTS (
          SELECT 1 FROM bookmark_topics bt WHERE bt.bookmark_id = b.id
        )
        """
    ).fetchall()
    for row in topic_rows:
        assign_topics(con, row["id"], row["text"])
        changed = True

    return changed


def chunk_text(text, max_chars=1600):
    text = "\n".join(line.rstrip() for line in (text or "").splitlines()).strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(split_long_paragraph(paragraph, max_chars))
            continue
        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= max_chars:
            current = candidate
        else:
            chunks.append(current.strip())
            current = paragraph
    if current:
        chunks.append(current.strip())
    return chunks[:80]


def split_long_paragraph(paragraph, max_chars):
    pieces = []
    remaining = paragraph.strip()
    while len(remaining) > max_chars:
        cut = remaining.rfind(" ", 0, max_chars)
        if cut < int(max_chars * 0.6):
            cut = max_chars
        piece = remaining[:cut].strip()
        if piece:
            pieces.append(piece)
        remaining = remaining[cut:].strip()
    if remaining:
        pieces.append(remaining)
    return pieces


def summarize_chunk(text, max_chars=260):
    clean = " ".join((text or "").split())
    if len(clean) <= max_chars:
        return clean
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    summary = ""
    for sentence in sentences:
        candidate = f"{summary} {sentence}".strip()
        if len(candidate) > max_chars:
            break
        summary = candidate
    if not summary:
        summary = clean[:max_chars].rsplit(" ", 1)[0]
    return summary.rstrip(" ,;:") + "..."


def infer_chunk_role(text):
    lower = (text or "").lower()
    if any(term in lower for term in ["step 1", "step 2", "blueprint", "workflow", "how to", "playbook"]):
        return "tactic"
    if any(term in lower for term in ["warning", "avoid", "never", "mistake", "problem", "penalize"]):
        return "warning"
    if any(term in lower for term in ["example prompt", "template", "prompt:", "copy", "draft"]):
        return "example"
    if any(term in lower for term in ["score", "metric", "signal", "conversion", "results"]):
        return "evidence"
    return "source"


def estimate_tokens(text):
    return max(1, int(len(text or "") / 4))


def normalize_domain(url):
    try:
        host = urlparse(url or "").netloc.lower()
    except ValueError:
        return None
    if host.startswith("www."):
        host = host[4:]
    return host or None


def is_safe_link_domain(domain):
    if not domain:
        return False
    if domain in SAFE_LINK_DOMAINS:
        return True
    return any(domain.endswith(suffix) for suffix in SAFE_LINK_SUFFIXES)


def upsert_bookmark_links(con, bookmark_id, links):
    now = now_iso()
    rows = []
    seen = set()
    for link in links:
        if not isinstance(link, dict):
            continue
        url = (link.get("expanded_url") or link.get("url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        domain = normalize_domain(url)
        if not is_safe_link_domain(domain):
            continue
        rows.append(
            (
                bookmark_id,
                url,
                link.get("expanded_url"),
                link.get("display_url"),
                domain,
                "pending",
                now,
                now,
            )
        )
    con.executemany(
        """
        INSERT INTO bookmark_links(
          bookmark_id, url, expanded_url, display_url, domain,
          hydration_status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(bookmark_id, url) DO UPDATE SET
          expanded_url=excluded.expanded_url,
          display_url=excluded.display_url,
          domain=excluded.domain,
          hydration_status=excluded.hydration_status,
          updated_at=excluded.updated_at
        """,
        rows,
    )


def stats():
    init_db()
    con = connect()
    try:
        total = con.execute("SELECT COUNT(*) AS n FROM bookmarks").fetchone()["n"]
        with_text = con.execute(
            "SELECT COUNT(*) AS n FROM bookmarks WHERE length(trim(text)) > 0"
        ).fetchone()["n"]
        last_sync_at = get_state(con, "last_sync_at")
        return {
            "db_path": str(DB_PATH),
            "db_exists": DB_PATH.exists(),
            "bookmarks_total": total,
            "bookmarks_with_text": with_text,
            "chunks": chunk_stats(con),
            "last_sync_at": last_sync_at,
            "fts5_available": validate_fts5(),
            "topics": list_topics(con, limit=12),
            "learned_categories": learned_topic_summary(limit=8, min_count=2),
            "links": link_stats(con),
        }
    finally:
        con.close()


def list_topics(con=None, limit=50):
    should_close = con is None
    if con is None:
        init_db()
        con = connect()
    try:
        rows = con.execute(
            """
            SELECT
              t.id,
              t.name,
              t.parent_id,
              COUNT(bt.bookmark_id) AS bookmark_count,
              AVG(bt.confidence) AS avg_confidence
            FROM topics t
            LEFT JOIN bookmark_topics bt ON bt.topic_id = t.id
            GROUP BY t.id, t.name, t.parent_id
            HAVING bookmark_count > 0
            ORDER BY bookmark_count DESC, avg_confidence DESC, t.name ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        if should_close:
            con.close()


def search(query, limit=20, topics=None):
    init_db()
    con = connect()
    fts_query = make_fts_query(query)
    try:
        if not fts_query:
            return []
        topic_filter = [t for t in (topics or []) if t]
        topic_sql = ""
        params = [fts_query]
        if topic_filter:
            placeholders = ",".join("?" for _ in topic_filter)
            topic_sql = (
            "AND b.id IN (SELECT bookmark_id FROM bookmark_topics "
                f"WHERE topic_id IN ({placeholders}) "
                f"OR topic_id IN (SELECT id FROM topics WHERE parent_id IN ({placeholders})))"
            )
            params.extend(topic_filter)
            params.extend(topic_filter)
        params.append(limit)
        rows = con.execute(
            f"""
            SELECT
              b.id, b.tweet_id, b.url, b.author_username, b.author_name,
              b.text, b.tweet_created_at, b.bookmarked_at,
              bm25(bookmarks_fts) AS score,
              (
                SELECT GROUP_CONCAT(topic_id)
                FROM bookmark_topics
                WHERE bookmark_id = b.id
              ) AS topics
            FROM bookmarks_fts
            JOIN bookmarks b ON b.rowid = bookmarks_fts.rowid
            WHERE bookmarks_fts MATCH ?
            {topic_sql}
            ORDER BY score
            LIMIT ?
            """,
            params,
        ).fetchall()
        return [normalize_search_row(row) for row in rows]
    except sqlite3.OperationalError:
        like = f"%{query}%"
        rows = con.execute(
            """
            SELECT id, tweet_id, url, author_username, author_name, text,
                   tweet_created_at, bookmarked_at, 0 AS score
            FROM bookmarks
            WHERE text LIKE ? OR author_username LIKE ?
            LIMIT ?
            """,
            (like, like, limit),
        ).fetchall()
        return [normalize_search_row(row) for row in rows]
    finally:
        con.close()


def search_chunks(query, limit=30, topics=None):
    init_db()
    con = connect()
    fts_query = make_fts_query(query)
    try:
        if not fts_query:
            return []
        author_rows = search_author_matches(con, query, limit, topics=topics)
        topic_filter = [t for t in (topics or []) if t]
        topic_sql = ""
        params = [fts_query]
        if topic_filter:
            placeholders = ",".join("?" for _ in topic_filter)
            topic_sql = (
                "AND b.id IN (SELECT bookmark_id FROM bookmark_topics "
                f"WHERE topic_id IN ({placeholders}) "
                f"OR topic_id IN (SELECT id FROM topics WHERE parent_id IN ({placeholders})))"
            )
            params.extend(topic_filter)
            params.extend(topic_filter)
        params.append(limit)
        rows = con.execute(
            f"""
            SELECT
              b.id, b.tweet_id, b.url, b.author_username, b.author_name,
              b.text, b.tweet_created_at, b.bookmarked_at,
              bc.chunk_index, bc.text AS chunk_text, bc.summary AS chunk_summary,
              bc.role AS chunk_role, bc.token_estimate AS chunk_token_estimate,
              bm25(bookmark_chunks_fts) AS chunk_score,
              (
                SELECT GROUP_CONCAT(topic_id)
                FROM bookmark_topics
                WHERE bookmark_id = b.id
              ) AS topics
            FROM bookmark_chunks_fts
            JOIN bookmark_chunks bc ON bc.id = bookmark_chunks_fts.rowid
            JOIN bookmarks b ON b.id = bc.bookmark_id
            WHERE bookmark_chunks_fts MATCH ?
            {topic_sql}
            ORDER BY chunk_score
            LIMIT ?
            """,
            params,
        ).fetchall()
        return merge_search_rows(author_rows, [normalize_search_row(row) for row in rows], limit)
    except sqlite3.OperationalError:
        return search(query, limit=limit, topics=topics)
    finally:
        con.close()


def search_author_matches(con, query, limit=10, topics=None):
    terms = author_search_terms(query)
    if not terms:
        return []
    topic_filter = [t for t in (topics or []) if t]
    topic_sql = ""
    topic_params = []
    if topic_filter:
        placeholders = ",".join("?" for _ in topic_filter)
        topic_sql = (
            "AND b.id IN (SELECT bookmark_id FROM bookmark_topics "
            f"WHERE topic_id IN ({placeholders}) "
            f"OR topic_id IN (SELECT id FROM topics WHERE parent_id IN ({placeholders})))"
        )
        topic_params.extend(topic_filter)
        topic_params.extend(topic_filter)
    conditions = []
    condition_params = []
    for term in terms[:8]:
        like = f"%{term}%"
        conditions.append(
            "(lower(b.author_username) LIKE ? OR lower(b.author_name) LIKE ? OR lower(b.url) LIKE ?)"
        )
        condition_params.extend([like, like, like])
    order_params = terms[:8] + terms[:8]
    rows = con.execute(
        f"""
        SELECT
          b.id, b.tweet_id, b.url, b.author_username, b.author_name,
          b.text, b.tweet_created_at, b.bookmarked_at,
          0 AS chunk_index,
          b.text AS chunk_text,
          substr(b.text, 1, 260) AS chunk_summary,
          'source' AS chunk_role,
          estimate AS chunk_token_estimate,
          -100.0 AS chunk_score,
          (
            SELECT GROUP_CONCAT(topic_id)
            FROM bookmark_topics
            WHERE bookmark_id = b.id
          ) AS topics
        FROM bookmarks b
        CROSS JOIN (SELECT 0 AS estimate)
        WHERE ({" OR ".join(conditions)})
        {topic_sql}
        ORDER BY
          CASE
            WHEN lower(b.author_username) IN ({",".join("?" for _ in terms[:8])}) THEN 0
            WHEN lower(b.author_name) IN ({",".join("?" for _ in terms[:8])}) THEN 1
            ELSE 2
          END,
          b.tweet_created_at DESC
        LIMIT ?
        """,
        condition_params + topic_params + order_params + [limit],
    ).fetchall()
    scored_rows = []
    for row in rows:
        result = normalize_search_row(row)
        match_score = author_candidate_score(result, terms)
        result["score"] = -100.0 - match_score
        result["chunk_score"] = result["score"]
        for evidence in result.get("evidence", []):
            evidence["score"] = result["score"]
        scored_rows.append((match_score, result.get("tweet_created_at") or "", result))
    scored_rows.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [item[2] for item in scored_rows]


def author_search_terms(query):
    tokens = [token.lower() for token in re.findall(r"[A-Za-z0-9_@.]+", query or "")]
    terms = []
    for token in tokens:
        token = token.strip("@.")
        if len(token) < 3 or token in STOP_TERMS:
            continue
        if token in {"ceo", "founder", "post", "posts", "said", "about", "tell"}:
            continue
        terms.append(token)
    return dedupe_preserve_order(terms)


def author_candidate_score(row, terms):
    username = (row.get("author_username") or "").lower()
    name = (row.get("author_name") or "").lower()
    url = (row.get("url") or "").lower()
    text = (row.get("text") or "").lower()
    score = 0
    for term in terms:
        term_score = 0
        if username == term or username == term.lstrip("@"):
            term_score = max(term_score, 8)
        elif term in username:
            term_score = max(term_score, 5)
        if term in name:
            term_score = max(term_score, 6)
        if term in url:
            term_score = max(term_score, 1)
        if term in text:
            term_score = max(term_score, 2)
        score += term_score
    return score


def merge_search_rows(primary, secondary, limit):
    merged = {}
    for row in list(primary or []) + list(secondary or []):
        key = row.get("tweet_id") or row.get("url") or row.get("id")
        if not key or key in merged:
            continue
        merged[key] = row
    return list(merged.values())[:limit]


def normalize_search_row(row):
    item = dict(row)
    topics = item.get("topics")
    if isinstance(topics, str):
        item["topics"] = sorted(set(t for t in topics.split(",") if t))
    elif not topics:
        item["topics"] = []
    return item


def dedupe_preserve_order(values):
    seen = set()
    output = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        output.append(value)
    return output


def learned_candidates(limit=30, min_count=2):
    init_db()
    con = connect()
    try:
        rows = con.execute(
            """
            SELECT term, count, promoted_topic_id, updated_at
            FROM learned_topic_candidates
            WHERE count >= ?
            ORDER BY count DESC, updated_at DESC
            LIMIT ?
            """,
            (min_count, limit * 8),
        ).fetchall()
        output = []
        for row in rows:
            item = dict(row)
            if not is_useful_learned_candidate(item["term"]):
                continue
            output.append(item)
            if len(output) >= limit:
                break
        return output
    finally:
        con.close()


def is_useful_learned_candidate(term):
    term = (term or "").strip().lower()
    if not term or term in STOP_TERMS:
        return False
    if term in SPECIAL_CANDIDATE_TERMS:
        return True
    if " " in term:
        parts = term.split()
        if len(parts) < 2 or any(part in STOP_TERMS for part in parts):
            return False
        if any(part in SPECIAL_CANDIDATE_TERMS for part in parts):
            return True
        return infer_candidate_parent(term) != "general"
    if infer_candidate_parent(term) != "general":
        return True
    if any(char.isdigit() for char in term) or any(char in term for char in ["-", "_", "+"]):
        return True
    return False


def chunk_stats(con=None):
    should_close = con is None
    if con is None:
        init_db()
        con = connect()
    try:
        total = con.execute("SELECT COUNT(*) AS n FROM bookmark_chunks").fetchone()["n"]
        token_total = con.execute("SELECT COALESCE(SUM(token_estimate), 0) AS n FROM bookmark_chunks").fetchone()["n"]
        rows = con.execute(
            """
            SELECT role, COUNT(*) AS count
            FROM bookmark_chunks
            GROUP BY role
            ORDER BY count DESC, role ASC
            """
        ).fetchall()
        return {"total": total, "token_estimate": token_total, "by_role": [dict(row) for row in rows]}
    finally:
        if should_close:
            con.close()


def link_stats(con=None):
    should_close = con is None
    if con is None:
        init_db()
        con = connect()
    try:
        total = con.execute("SELECT COUNT(*) AS n FROM bookmark_links").fetchone()["n"]
        pending = con.execute(
            "SELECT COUNT(*) AS n FROM bookmark_links WHERE hydration_status = 'pending'"
        ).fetchone()["n"]
        rows = con.execute(
            """
            SELECT domain, COUNT(*) AS count
            FROM bookmark_links
            WHERE domain IS NOT NULL
            GROUP BY domain
            ORDER BY count DESC, domain ASC
            LIMIT 10
            """
        ).fetchall()
        return {"total": total, "pending_safe_domains": pending, "top_domains": [dict(row) for row in rows]}
    finally:
        if should_close:
            con.close()


def list_links(limit=30, status=None):
    init_db()
    con = connect()
    try:
        where = ""
        params = []
        if status:
            where = "WHERE bl.hydration_status = ?"
            params.append(status)
        params.append(limit)
        rows = con.execute(
            f"""
            SELECT
              bl.bookmark_id, bl.url, bl.expanded_url, bl.display_url,
              bl.domain, bl.hydration_status, b.author_username, b.text
            FROM bookmark_links bl
            LEFT JOIN bookmarks b ON b.id = bl.bookmark_id
            {where}
            ORDER BY bl.updated_at DESC
            LIMIT ?
            """,
            params,
        ).fetchall()
        output = []
        for row in rows:
            item = dict(row)
            item["text"] = (item.get("text") or "")[:240]
            output.append(item)
        return output
    finally:
        con.close()


def make_fts_query(query):
    tokens = re.findall(r"[A-Za-z0-9_#@]+", query or "")
    tokens = [t for t in tokens if len(t) > 1 and t.lower() not in STOP_TERMS]
    return " OR ".join(tokens[:12])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--init", action="store_true")
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.init:
        init_db()
        print(json.dumps({"ok": True, "db_path": str(DB_PATH), "fts5_available": validate_fts5()}, indent=2))
        return

    if args.stats:
        print(json.dumps(stats(), indent=2))
        return

    if args.self_test:
        init_db()
        sample = [
            {
                "id": "sample-1",
                "tweet_id": "sample-1",
                "url": "https://x.com/example/status/sample-1",
                "author_username": "example",
                "author_name": "Example",
                "text": "Marketing launch growth agent payments test bookmark.",
                "raw": {"sample": True},
            }
        ]
        result = upsert_bookmarks(sample)
        rows = search("marketing", 5)
        print(json.dumps({"ok": bool(rows), "upsert": result, "results": rows}, indent=2))
        return

    parser.print_help()


if __name__ == "__main__":
    main()
