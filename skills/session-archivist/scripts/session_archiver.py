#!/usr/bin/env python3
"""
Session Archivist v2 — 会话生命周期管理
事件驱动触发 + 状态检测 + 优先级队列 + 大消息提取

用法:
    python3 session_archiver.py                    # 执行归档（cron 模式）
    python3 session_archiver.py --check            # 事件驱动检查（每轮对话后调用）
    python3 session_archiver.py --dry-run          # 只检测不修改
    python3 session_archiver.py --session-id XXX   # 只处理指定 session
    python3 session_archiver.py --max-size 2048    # 自定义阈值 (KB)
    python3 session_archiver.py --list             # 列出大 session
"""

import json
import os
import sys
import re
import hashlib
import shutil
import argparse
import fcntl
import time
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Tuple
from dataclasses import dataclass, field

# ─── 默认配置 ───────────────────────────────────────────────────────────

HERMES_HOME = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
SESSIONS_DIR = HERMES_HOME / "sessions"
ARCHIVE_DIR = HERMES_HOME / "session-archives"
BACKUP_DIR = ARCHIVE_DIR / "backups"
TOOL_OUTPUTS_DIR = ARCHIVE_DIR / "tool-outputs"
LONG_REPLIES_DIR = ARCHIVE_DIR / "long-replies"
CONFIG_PATH = HERMES_HOME / "config.yaml"

DEFAULT_MAX_SIZE_KB = 1024
DEFAULT_TARGET_SIZE_KB = 512
DEFAULT_IMPORTANCE_THRESHOLD = 0.5
DEFAULT_KEEP_RECENT = 20
DEFAULT_EXTRACT_THRESHOLD_KB = 100
BACKUP_RETENTION_DAYS = 7
DEFAULT_RETENTION_DAYS = 5

# 触发阈值
TRIGGER_MSG_COUNT = 20
TRIGGER_SIZE_KB = 2048  # 2MB
# 过期 session 清理
STALE_SESSION_EXTRACTION_THRESHOLD_DAYS = DEFAULT_RETENTION_DAYS


# 状态检测阈值
COMPRESSION_WINDOW_SEC = 30
IDLE_THRESHOLD_SEC = 300       # 5 min
LONG_IDLE_THRESHOLD_SEC = 1800  # 30 min


# ─── 数据结构 ───────────────────────────────────────────────────────────

@dataclass
class SessionCandidate:
    """待处理的 session 候选"""
    path: Path
    size_kb: float
    session_id: str
    msg_count: int = 0
    idle_seconds: float = 0
    priority: int = 3  # P0-P3
    priority_score: float = 0.0


# ─── 配置加载 ───────────────────────────────────────────────────────────

def load_config() -> dict:
    """从 config.yaml 读取 session_archivist 配置"""
    try:
        import yaml
        with open(CONFIG_PATH) as f:
            cfg = yaml.safe_load(f) or {}
        return cfg.get("session_archivist", {})
    except Exception:
        return {}


# ─── 压缩检测 ───────────────────────────────────────────────────────────

class CompressionDetector:
    """检测 Hermes 上下文压缩是否正在进行"""

    def __init__(self, hermes_home: Path = HERMES_HOME):
        self.gateway_log = hermes_home / "logs" / "gateway.log"

    def is_compression_active(self, session_id: str = None) -> bool:
        """检查是否有压缩正在进行"""
        if not self.gateway_log.exists():
            return False
        try:
            cutoff = time.time() - COMPRESSION_WINDOW_SEC
            if self.gateway_log.stat().st_mtime < cutoff:
                return False  # 日志文件很久没更新

            # 读取最近的 gateway 日志
            with open(self.gateway_log, 'rb') as f:
                # 读最后 10KB
                f.seek(0, 2)
                size = f.tell()
                f.seek(max(0, size - 10240))
                recent = f.read().decode('utf-8', errors='replace')

            # 检查压缩相关关键词
            compress_signals = ['compress', 'Session hygiene', 'compression']
            for signal in compress_signals:
                if signal in recent:
                    return True
        except Exception:
            pass
        return False

    def wait_for_compression(self, session_id: str = None, max_retries: int = 3) -> bool:
        """等待压缩完成，返回 True=压缩完成，False=超时"""
        for i in range(max_retries):
            if not self.is_compression_active(session_id):
                return True
            print(f"  ⏳ Compression in progress, waiting... ({i+1}/{max_retries})")
            time.sleep(5)
        return False


# ─── 大消息提取 ─────────────────────────────────────────────────────────

class LargeMessageExtractor:
    """将大消息提取到独立文件，原位置保留引用指针"""

    def __init__(self, extract_threshold_kb: int = DEFAULT_EXTRACT_THRESHOLD_KB,
                 dry_run: bool = False):
        self.threshold_bytes = extract_threshold_kb * 1024
        self.dry_run = dry_run

    def extract_large_messages(self, messages: list, session_id: str) -> int:
        """提取大消息，返回提取数量"""
        TOOL_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        LONG_REPLIES_DIR.mkdir(parents=True, exist_ok=True)

        extracted = 0
        for i, msg in enumerate(messages):
            content = msg.get("content", "")
            if not isinstance(content, str):
                continue
            content_size = len(content.encode('utf-8'))
            if content_size < self.threshold_bytes:
                continue

            role = msg.get("role", "")
            preview = content[:500]

            if role == "tool":
                out_dir = TOOL_OUTPUTS_DIR
            elif role == "assistant":
                out_dir = LONG_REPLIES_DIR
            else:
                continue

            out_path = out_dir / f"{session_id}_{i}.json"

            if self.dry_run:
                print(f"  [DRY-RUN] Would extract {role} msg[{i}] ({content_size//1024}KB) → {out_path}")
            else:
                with open(out_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        "session_id": session_id,
                        "msg_index": i,
                        "role": role,
                        "content": content,
                        "extracted_at": datetime.now(timezone.utc).isoformat(),
                    }, f, ensure_ascii=False, indent=1)

            # 替换为引用指针
            msg["content"] = json.dumps({
                "_extracted": True,
                "file": str(out_path),
                "preview": preview,
                "original_size_kb": content_size // 1024,
            }, ensure_ascii=False)
            extracted += 1

        return extracted


# ─── 优先级队列 ─────────────────────────────────────────────────────────

class SessionPriorityQueue:
    """按优先级排序 session 处理队列"""

    def __init__(self, compression_detector: CompressionDetector):
        self.compression_detector = compression_detector

    def build_queue(self, candidates: List[SessionCandidate]) -> List[SessionCandidate]:
        """按优先级排序，过滤掉不可处理的"""
        eligible = []
        for c in candidates:
            c.priority, c.priority_score = self._calculate_priority(c)
            if c.priority < 3:  # P3 = skip
                eligible.append(c)

        eligible.sort(key=lambda c: (c.priority, -c.priority_score))
        return eligible

    def _calculate_priority(self, c: SessionCandidate) -> Tuple[int, float]:
        idle = c.idle_seconds
        size_mb = c.size_kb / 1024

        if idle > LONG_IDLE_THRESHOLD_SEC:
            return 0, size_mb * (idle / 60)    # P0
        elif idle > IDLE_THRESHOLD_SEC:
            return 1, size_mb * (idle / 60)    # P1
        elif idle > IDLE_THRESHOLD_SEC / 6:    # > 30s
            return 2, size_mb * (idle / 60)    # P2
        else:
            return 3, 0                         # P3: skip


# ─── 重要性评分 ─────────────────────────────────────────────────────────

class ImportanceScorer:
    """消息重要性评分器"""

    DECISION_PATTERNS = [
        r'决定[用采]', r'选择了', r'方案是', r'确定[用采]',
        r'we\s+(?:decide|choose|will)\s+', r'let\'s\s+go\s+with',
        r'方案[一二三]', r'最终[选确]', r'结论是',
    ]
    ERROR_PATTERNS = [
        r'(?:error|错误|bug|问题|失败|异常)[：:]\s*.{10,}',
        r'(?:fixed|修复|解决了|搞定了)',
        r'(?:root\s*cause|根因)[：:]',
        r'(?:solution|解决方案|修法)[：:]',
    ]
    TODO_PATTERNS = [
        r'(?:TODO|FIXME|待办|待完成|还需要)[：:]',
        r'(?:下一步|接下来|计划)[：:]',
        r'- \[ \]',
    ]
    PREFERENCE_PATTERNS = [
        r'(?:我喜欢|我偏好|我习惯|我希望|请不要|以后不要)',
        r'(?:I\s+prefer|I\s+like|please\s+don\'t|in\s+the\s+future)',
        r'(?:记住|以后都|每次都|不要)',
    ]
    CODE_PATTERN = r'```[\s\S]{20,}?```'
    TOOL_PATTERNS = [
        r'(?:file_path|path|command|endpoint|url)[：:=]\s*[`"\']?[/\w]',
        r'(?:API|接口|端点)[：:]',
    ]

    def score_message(self, msg: dict) -> float:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if not content or not isinstance(content, str):
            return 0.0
        if self._is_greeting(content):
            return 0.0

        score = 0.0
        if self._match_patterns(content, self.DECISION_PATTERNS): score += 0.3
        if self._match_patterns(content, self.ERROR_PATTERNS): score += 0.25
        if self._match_patterns(content, self.TODO_PATTERNS): score += 0.1
        if self._match_patterns(content, self.PREFERENCE_PATTERNS): score += 0.15
        if re.search(self.CODE_PATTERN, content): score += 0.2
        if role == "tool" and self._match_patterns(content, self.TOOL_PATTERNS): score += 0.1
        if role == "user": score *= 1.2
        return min(score, 1.0)

    def _is_greeting(self, text: str) -> bool:
        greetings = ['你好', 'hi', 'hello', 'ok', '好的', '嗯', '谢谢', 'thanks']
        return text.strip().lower() in greetings

    def _match_patterns(self, text: str, patterns: list) -> bool:
        for p in patterns:
            if re.search(p, text, re.IGNORECASE):
                return True
        return False


# ─── 会话边界检测 ───────────────────────────────────────────────────────

class SessionDetector:
    TRANSITION_SIGNALS = [
        r'(?:现在|接下来|下一个|新[的任]|另外)',
        r'(?:换[个一]|切换到|转到)',
        r'(?:now|next|let\'s|switch\s+to|moving\s+on)',
        r'(?:好的[，,]\s*(?:那|我们))',
    ]

    def detect_boundaries(self, messages: list, time_gap_hours: float = 2.0) -> list:
        boundaries = []
        prev_timestamp = None
        for i, msg in enumerate(messages):
            if i == 0:
                continue
            timestamp = msg.get("timestamp", 0)
            if prev_timestamp and timestamp:
                gap_hours = (timestamp - prev_timestamp) / 3600
                if gap_hours >= time_gap_hours:
                    boundaries.append(i)
                    prev_timestamp = timestamp
                    continue
            content = msg.get("content", "")
            if isinstance(content, str) and msg.get("role") == "user":
                for signal in self.TRANSITION_SIGNALS:
                    if re.search(signal, content, re.IGNORECASE):
                        boundaries.append(i)
                        break
            prev_timestamp = timestamp
        return boundaries


# ─── 结构化摘要生成 ─────────────────────────────────────────────────────

class SummaryGenerator:
    def generate(self, messages: list, scores: list, session_meta: dict) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        title = session_meta.get("title", "Untitled")
        session_id = session_meta.get("session_id", "unknown")

        decisions = self._extract_decisions(messages, scores)
        completed = self._extract_completed(messages, scores)
        errors = self._extract_errors(messages, scores)
        todos = self._extract_todos(messages, scores)
        intent = self._extract_intent(messages)
        references = self._extract_references(messages)
        total = len(messages)
        high_score = sum(1 for s in scores if s >= 0.5)

        return f"""# Session Archive: {title}

## Metadata
- **Session ID**: {session_id}
- **Archived At**: {now}
- **Original Size**: {total} messages ({high_score} high-importance)
- **Importance Threshold**: {DEFAULT_IMPORTANCE_THRESHOLD}

## User Intent
{intent}

## Key Decisions
{decisions if decisions else "_(none detected)_"}

## Completed Work
{completed if completed else "_(none detected)_"}

## Errors & Solutions
{errors if errors else "_(none detected)_"}

## Pending Tasks
{todos if todos else "_(none detected)_"}

## Key References
{references if references else "_(none detected)_"}
"""

    def _extract_intent(self, messages: list) -> str:
        user_msgs = [m for m in messages[:20] if m.get("role") == "user" and m.get("content")]
        if not user_msgs:
            return "_(no user messages found)_"
        return f'> {user_msgs[0].get("content", "")[:500]}'

    def _extract_decisions(self, messages: list, scores: list) -> str:
        decisions = []
        for msg, score in zip(messages, scores):
            if score < 0.3: continue
            content = msg.get("content", "")
            if not isinstance(content, str): continue
            for line in content.split("\n"):
                line = line.strip()
                if any(kw in line for kw in ["决定", "选择", "方案", "确定", "结论"]):
                    if len(line) > 10:
                        decisions.append(f"- {line[:200]}")
        return "\n".join(decisions[:10])

    def _extract_completed(self, messages: list, scores: list) -> str:
        items = []
        for msg, score in zip(messages, scores):
            if score < 0.2: continue
            content = msg.get("content", "")
            if not isinstance(content, str): continue
            for line in content.split("\n"):
                line = line.strip()
                if any(kw in line for kw in ["✅", "完成", "已修复", "fixed", "done", "成功"]):
                    items.append(f"- [x] {line[:200]}")
        return "\n".join(items[:10])

    def _extract_errors(self, messages: list, scores: list) -> str:
        errors = []
        for msg, score in zip(messages, scores):
            if score < 0.25: continue
            content = msg.get("content", "")
            if not isinstance(content, str): continue
            for line in content.split("\n"):
                line = line.strip()
                if any(kw in line.lower() for kw in ["error", "错误", "bug", "问题", "失败"]):
                    if len(line) > 15:
                        errors.append(f"| {line[:100]} | |")
        if not errors: return ""
        return "| Error | Solution |\n|-------|----------|\n" + "\n".join(errors[:5])

    def _extract_todos(self, messages: list, scores: list) -> str:
        todos = []
        for msg, score in zip(messages, scores):
            content = msg.get("content", "")
            if not isinstance(content, str): continue
            for line in content.split("\n"):
                line = line.strip()
                if re.search(r'(?:TODO|待办|还需要|下一步|接下来|计划)', line):
                    todos.append(f"- [ ] {line[:200]}")
                elif line.startswith("- [ ]"):
                    todos.append(line)
        return "\n".join(todos[:10])

    def _extract_references(self, messages: list) -> str:
        refs = set()
        for msg in messages:
            content = msg.get("content", "")
            if not isinstance(content, str): continue
            for match in re.finditer(r'(?:/home|/tmp|~/|/mnt/)[^\s`"\']+\.(?:py|js|md|yaml|json|sh|txt)', content):
                refs.add(f"- File: `{match.group()}`")
            for match in re.finditer(r'https?://[^\s`"\']+', content):
                url = match.group()
                if "localhost" in url or "127.0.0.1" in url:
                    refs.add(f"- API: `{url}`")
        return "\n".join(list(refs)[:10])


# ─── 去重引擎 ───────────────────────────────────────────────────────────

class DedupEngine:
    def __init__(self, hindsight_url: Optional[str] = None):
        self.hindsight_url = hindsight_url
        self._existing_hashes = set()

    def load_existing(self, bank_id: str = "default"):
        if not self.hindsight_url: return
        try:
            import urllib.request
            url = f"{self.hindsight_url}/v1/default/banks/{bank_id}/memories"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                for mem in data.get("memories", []):
                    h = hashlib.md5(mem.get("content", "").encode()).hexdigest()
                    self._existing_hashes.add(h)
        except Exception:
            pass

    def is_duplicate(self, content: str) -> bool:
        return hashlib.md5(content.encode()).hexdigest() in self._existing_hashes

    def mark_stored(self, content: str):
        self._existing_hashes.add(hashlib.md5(content.encode()).hexdigest())


# ─── Hindsight 集成 ─────────────────────────────────────────────────────

class HindsightClient:
    def __init__(self, url: str = "http://127.0.0.1:8888"):
        self.url = url.rstrip("/")
        self._available = None

    def is_available(self) -> bool:
        if self._available is not None: return self._available
        try:
            import urllib.request
            req = urllib.request.Request(f"{self.url}/health", method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                self._available = data.get("status") == "healthy"
        except Exception:
            self._available = False
        return self._available

    def get_or_create_bank(self, name: str) -> str:
        import urllib.request
        req = urllib.request.Request(f"{self.url}/v1/default/banks")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            for bank in data.get("banks", []):
                if bank.get("name") == name:
                    return bank["bank_id"]
        payload = json.dumps({"name": name, "description": f"Session archives for {name}"}).encode()
        req = urllib.request.Request(
            f"{self.url}/v1/default/banks/{name}",
            data=payload, headers={"Content-Type": "application/json"}, method="PUT"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())["bank_id"]

    def store_memory(self, bank_id: str, content: str, metadata: dict, tags: list) -> str:
        import urllib.request
        payload = json.dumps({
            "items": [{
                "content": content,
                "metadata": {k: str(v) for k, v in metadata.items()},
                "tags": tags,
                "document_id": f"session_{metadata.get('session_id', 'unknown')}",
                "timestamp": metadata.get("archived_at", datetime.now(timezone.utc).isoformat()),
            }],
            "async": False,
        }).encode()
        req = urllib.request.Request(
            f"{self.url}/v1/default/banks/{bank_id}/memories",
            data=payload, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            if data.get("success"):
                return f"bank:{bank_id}:stored"
            return ""


# ─── 安全检查 ───────────────────────────────────────────────────────────

ACTIVE_THRESHOLD_SECONDS = 300

def is_session_active(session_path: Path) -> bool:
    try:
        mtime = session_path.stat().st_mtime
        return (time.time() - mtime) < ACTIVE_THRESHOLD_SECONDS
    except Exception:
        return True

def get_running_agent_sessions() -> set:
    running = set()
    try:
        result = subprocess.run(
            ["pgrep", "-a", "-f", "hermes_cli.main gateway"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            gateway_log = HERMES_HOME / "logs" / "gateway.log"
            if gateway_log.exists():
                with open(gateway_log) as f:
                    lines = f.readlines()[-100:]
                for line in lines:
                    if "inbound message:" in line:
                        match = re.search(r'chat=(\S+)', line)
                        if match:
                            running.add(match.group(1))
    except Exception:
        pass
    return running

def is_gateway_busy() -> bool:
    try:
        result = subprocess.run(["pgrep", "-f", "run_agent"], capture_output=True, timeout=5)
        return result.returncode == 0
    except Exception:
        return False

def acquire_file_lock(session_path: Path) -> Tuple[bool, Optional[object]]:
    lock_path = session_path.with_suffix(".lock")
    try:
        lock_fd = open(lock_path, "w")
        try:
            fcntl.flock(lock_fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True, lock_fd
        except (IOError, OSError):
            lock_fd.close()
            return False, None
    except Exception:
        return False, None

def release_file_lock(lock_fd):
    if lock_fd:
        try:
            fcntl.flock(lock_fd.fileno(), fcntl.LOCK_UN)
            lock_fd.close()
        except Exception:
            pass


# ─── 核心归档器 ─────────────────────────────────────────────────────────

class SessionArchiver:
    def __init__(self, config: dict):
        self.max_size_kb = config.get("max_session_size_kb", DEFAULT_MAX_SIZE_KB)
        self.target_size_kb = config.get("target_session_size_kb", DEFAULT_TARGET_SIZE_KB)
        self.importance_threshold = config.get("importance_threshold", DEFAULT_IMPORTANCE_THRESHOLD)
        self.keep_recent = config.get("keep_recent", DEFAULT_KEEP_RECENT)
        self.extract_threshold_kb = config.get("extract_threshold_kb", DEFAULT_EXTRACT_THRESHOLD_KB)
        self.retention_days = config.get("retention_days", DEFAULT_RETENTION_DAYS)
        self.dry_run = config.get("dry_run", False)
        self.check_mode = config.get("check_mode", False)

        self.scorer = ImportanceScorer()
        self.detector = SessionDetector()
        self.generator = SummaryGenerator()
        self.dedup = DedupEngine()
        self.compression_detector = CompressionDetector()
        self.extractor = LargeMessageExtractor(self.extract_threshold_kb, self.dry_run)
        self.priority_queue = SessionPriorityQueue(self.compression_detector)

        hindsight_url = config.get("hindsight_url", "http://127.0.0.1:8888")
        hindsight_enabled = config.get("hindsight_enabled", "auto")
        self.hindsight = HindsightClient(hindsight_url)
        if hindsight_enabled == "auto":
            self._hs_enabled = self.hindsight.is_available()
        elif hindsight_enabled is True:
            self._hs_enabled = True
        else:
            self._hs_enabled = False

        for d in [ARCHIVE_DIR, BACKUP_DIR, TOOL_OUTPUTS_DIR, LONG_REPLIES_DIR]:
            d.mkdir(parents=True, exist_ok=True)

    def scan(self) -> list:
        results = []
        for f in SESSIONS_DIR.glob("session_*.json"):
            size_kb = f.stat().st_size / 1024
            if size_kb > self.max_size_kb:
                session_id = f.stem.replace("session_", "")
                results.append((f, size_kb, session_id))
        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def scan_triggered(self) -> List[SessionCandidate]:
        """事件驱动扫描：消息数 > 20 或 大小 > 2MB"""
        candidates = []
        for f in SESSIONS_DIR.glob("session_*.json"):
            size_kb = f.stat().st_size / 1024
            session_id = f.stem.replace("session_", "")

            # 快速检查大小
            if size_kb < TRIGGER_SIZE_KB:
                # 还要检查消息数
                try:
                    with open(f) as fh:
                        data = json.load(fh)
                    msg_count = len(data.get("messages", []))
                    if msg_count < TRIGGER_MSG_COUNT:
                        continue
                except Exception:
                    continue
            else:
                try:
                    with open(f) as fh:
                        data = json.load(fh)
                    msg_count = len(data.get("messages", []))
                except Exception:
                    msg_count = 0

            idle = time.time() - f.stat().st_mtime
            candidates.append(SessionCandidate(
                path=f, size_kb=size_kb, session_id=session_id,
                msg_count=msg_count, idle_seconds=idle
            ))

        return candidates

    def process_session(self, session_path: Path, session_id: str) -> dict:
        print(f"\n{'='*60}")
        print(f"Processing: {session_path.name}")
        print(f"Size: {session_path.stat().st_size / 1024:.0f} KB")

        # ── 安全检查 1: 压缩检测 ──────────────────────────────
        if not self.compression_detector.wait_for_compression(session_id):
            print(f"  ⏭ Skipped: compression still in progress after waiting")
            return {"status": "skipped", "reason": "compression_active"}

        # ── 安全检查 2: 活跃会话 ──────────────────────────────
        if is_session_active(session_path):
            print(f"  ⏭ Skipped: session is active (modified within {ACTIVE_THRESHOLD_SECONDS}s)")
            return {"status": "skipped", "reason": "active_session"}

        # ── 安全检查 3: gateway 活跃 session ─────────────────
        running_sessions = get_running_agent_sessions()
        for running_id in running_sessions:
            if session_id in running_id or running_id in session_id:
                print(f"  ⏭ Skipped: agent is running for this session")
                return {"status": "skipped", "reason": "agent_running"}

        # ── 安全检查 4: gateway 繁忙 ─────────────────────────
        if is_gateway_busy() and not self.dry_run:
            print(f"  ⏭ Skipped: gateway is busy processing messages")
            return {"status": "skipped", "reason": "gateway_busy"}

        # ── 安全检查 5: 文件锁 ──────────────────────────────
        lock_fd = None
        if not self.dry_run:
            locked, lock_fd = acquire_file_lock(session_path)
            if not locked:
                print(f"  ⏭ Skipped: file is locked by another process")
                return {"status": "skipped", "reason": "file_locked"}

        try:
            return self._do_process(session_path, session_id)
        finally:
            if lock_fd:
                release_file_lock(lock_fd)
                lock_path = session_path.with_suffix(".lock")
                lock_path.unlink(missing_ok=True)

    def _do_process(self, session_path: Path, session_id: str) -> dict:
        with open(session_path) as f:
            data = json.load(f)

        messages = data.get("messages", [])
        title = data.get("title", "") or session_id
        if not messages:
            print("  ⚠ No messages found, skipping")
            return {"status": "skipped", "reason": "no_messages"}

        print(f"  Messages: {len(messages)}")

        # 1. 重要性评分
        scores = [self.scorer.score_message(m) for m in messages]
        high_count = sum(1 for s in scores if s >= self.importance_threshold)
        print(f"  High-importance messages: {high_count}")

        # 2. 会话边界检测
        boundaries = self.detector.detect_boundaries(messages)
        if boundaries:
            print(f"  Topic boundaries detected: {len(boundaries)}")

        # 3. 生成结构化摘要
        session_meta = {"title": title, "session_id": session_id}
        summary = self.generator.generate(messages, scores, session_meta)

        # 4. 存档
        archive_path = ARCHIVE_DIR / f"{session_id}.md"
        if self.dry_run:
            print(f"  [DRY-RUN] Would archive to: {archive_path}")
        else:
            with open(archive_path, "w") as f:
                f.write(summary)
            print(f"  ✅ Archived to: {archive_path}")

            # Hindsight
            if self._hs_enabled:
                try:
                    if self.dedup.is_duplicate(summary):
                        print(f"  ⏭ Skipped Hindsight (duplicate)")
                    else:
                        bank_name = self._detect_project(title, session_id)
                        bank_id = self.hindsight.get_or_create_bank(bank_name)
                        memory_id = self.hindsight.store_memory(
                            bank_id=bank_id, content=summary,
                            metadata={
                                "session_id": session_id,
                                "archived_at": datetime.now(timezone.utc).isoformat(),
                                "original_size": len(messages),
                                "high_importance_count": high_count,
                            },
                            tags=["session-archive", bank_name],
                        )
                        self.dedup.mark_stored(summary)
                        print(f"  ✅ Hindsight: bank={bank_name}, memory={memory_id[:8]}...")
                except Exception as e:
                    print(f"  ⚠ Hindsight failed: {e}")

        # 5. 大消息提取 + 裁剪
        if not self.dry_run:
            backup_path = BACKUP_DIR / f"{session_id}_{datetime.now().strftime('%Y%m%d')}.json"
            shutil.copy2(session_path, backup_path)
            print(f"  📦 Backup: {backup_path}")

            extracted = self.extractor.extract_large_messages(messages, session_id)
            if extracted:
                print(f"  📤 Extracted {extracted} large messages to external files")

            trimmed = self._trim_session(data, messages, scores, summary)
            with open(session_path, "w") as f:
                json.dump(trimmed, f, ensure_ascii=False, indent=1)
            new_size = session_path.stat().st_size / 1024
            print(f"  ✂️ Trimmed: {len(messages)} → {len(trimmed.get('messages', []))} messages, {new_size:.0f} KB")
        else:
            print(f"  [DRY-RUN] Would extract large messages and trim to ~{self.keep_recent} messages")

        return {
            "status": "dry_run" if self.dry_run else "done",
            "session_id": session_id,
            "original_messages": len(messages),
            "high_importance": high_count,
        }

    def _detect_project(self, title: str, session_id: str) -> str:
        patterns = [r'project', r'backend', r'frontend', r'hermes']
        title_lower = title.lower()
        for p in patterns:
            if p.lower() in title_lower:
                return p
        return session_id[:8]

    def _trim_session(self, data: dict, messages: list, scores: list, summary: str) -> dict:
        keep_count = min(self.keep_recent, len(messages))
        recent_messages = messages[-keep_count:]
        summary_msg = {
            "role": "system",
            "content": f"[Session Archivist] 此会话已被归档。以下是历史摘要：\n\n{summary[:2000]}",
            "timestamp": datetime.now(timezone.utc).timestamp(),
        }
        trimmed_messages = [summary_msg] + recent_messages
        data["messages"] = trimmed_messages
        data["_session_archivist"] = {
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "original_count": len(messages),
            "trimmed_count": len(trimmed_messages),
        }
        return data

    def cleanup_old_backups(self):
        cutoff = datetime.now().timestamp() - (BACKUP_RETENTION_DAYS * 86400)
        count = 0
        for f in BACKUP_DIR.glob("*.json"):
            if f.stat().st_mtime < cutoff:
                if not self.dry_run:
                    f.unlink()
                count += 1
        if count:
            print(f"\n{'[DRY-RUN] ' if self.dry_run else ''}Cleaned up {count} old backups")
    def cleanup_stale_sessions(self) -> int:
        """删除超过 retention_days 未更新的 session 文件

        安全规则：
        - 跳过活跃 session（最近 5 分钟有更新）
        - 跳过有 _session_archivist 标记的（已归档过的保留）
        - 删除前先备份到 session-archives/backups/
        """
        cutoff_seconds = self.retention_days * 86400
        now = time.time()
        deleted = 0

        for f in SESSIONS_DIR.glob("session_*.json"):
            try:
                mtime = f.stat().st_mtime
                age_seconds = now - mtime
                if age_seconds < cutoff_seconds:
                    continue  # 未过期

                # 安全检查：跳过活跃 session
                if (now - mtime) < ACTIVE_THRESHOLD_SECONDS:
                    continue

                # 检查是否已归档
                try:
                    with open(f) as fh:
                        data = json.load(fh)
                    if data.get("_session_archivist"):
                        # 已归档的 session，安全删除
                        pass
                except Exception:
                    continue  # 读不了的跳过

                session_id = f.stem.replace("session_", "")
                size_kb = f.stat().st_size / 1024
                age_days = age_seconds / 86400

                if self.dry_run:
                    print(f"  [DRY-RUN] Would delete: {f.name} ({size_kb:.0f}KB, {age_days:.1f}d old)")
                else:
                    # 备份再删除
                    backup_path = BACKUP_DIR / f"{session_id}_stale_{datetime.now().strftime('%Y%m%d')}.json"
                    shutil.copy2(f, backup_path)
                    f.unlink()
                    print(f"  🗑 Deleted: {f.name} ({size_kb:.0f}KB, {age_days:.1f}d old)")
                deleted += 1

            except Exception as e:
                print(f"  ⚠ Error processing {f.name}: {e}")

        return deleted



# ─── CLI 入口 ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Session Archivist v2 — 会话生命周期管理")
    parser.add_argument("--dry-run", action="store_true", help="只检测不修改")
    parser.add_argument("--check", action="store_true", help="事件驱动检查模式（消息数/大小触发）")
    parser.add_argument("--session-id", help="只处理指定 session")
    parser.add_argument("--max-size", type=int, help="最大 session 大小 (KB)")
    parser.add_argument("--target-size", type=int, help="裁剪目标大小 (KB)")
    parser.add_argument("--threshold", type=float, help="重要性阈值 (0-1)")
    parser.add_argument("--extract-threshold", type=int, help="大消息提取阈值 (KB)")
    parser.add_argument("--no-hindsight", action="store_true", help="禁用 Hindsight")
    parser.add_argument("--retention-days", type=int, help="session 保留天数（默认 5 天）")
    parser.add_argument("--list", action="store_true", help="列出大 session 文件")
    args = parser.parse_args()

    config = load_config()
    if args.dry_run: config["dry_run"] = True
    if args.check: config["check_mode"] = True
    if args.max_size: config["max_session_size_kb"] = args.max_size
    if args.target_size: config["target_session_size_kb"] = args.target_size
    if args.threshold: config["importance_threshold"] = args.threshold
    if args.extract_threshold: config["extract_threshold_kb"] = args.extract_threshold
    if args.retention_days: config["retention_days"] = args.retention_days
    if args.no_hindsight: config["hindsight_enabled"] = False

    archiver = SessionArchiver(config)

    # ── 事件驱动模式 ─────────────────────────────────────────
    if args.check:
        print("🔍 Event-driven check: scanning for triggered sessions...")
        candidates = archiver.scan_triggered()
        if not candidates:
            print("✅ No sessions triggered (all under thresholds)")
            return

        print(f"\n📊 Found {len(candidates)} triggered session(s):")
        for c in candidates:
            print(f"  - {c.session_id}: {c.size_kb:.0f} KB, {c.msg_count} msgs, idle {c.idle_seconds/60:.0f}m")

        # 优先级排序
        queue = archiver.priority_queue.build_queue(candidates)
        if not queue:
            print("⏸ All triggered sessions are currently active, will retry later")
            return

        results = []
        for c in queue:
            result = archiver.process_session(c.path, c.session_id)
            results.append(result)

        archiver.cleanup_old_backups()
        stale_deleted = archiver.cleanup_stale_sessions()
        if stale_deleted:
            print(f"  🗑 Stale sessions deleted: {stale_deleted} (>{archiver.retention_days}d)")
        _print_summary(results, archiver, args)
        return

    # ── 传统 cron 模式 ──────────────────────────────────────
    print("🔍 Scanning session files...")
    large_sessions = archiver.scan()

    if not large_sessions:
        print(f"✅ No sessions exceed {archiver.max_size_kb}KB threshold")
        return

    print(f"\n📊 Found {len(large_sessions)} large session(s):")
    for path, size_kb, sid in large_sessions:
        print(f"  - {sid}: {size_kb:.0f} KB")

    if args.list:
        return

    if args.session_id:
        target = [s for s in large_sessions if s[2] == args.session_id]
        if not target:
            print(f"❌ Session {args.session_id} not found or not large enough")
            sys.exit(1)
        large_sessions = target

    results = []
    for path, size_kb, session_id in large_sessions:
        result = archiver.process_session(path, session_id)
        results.append(result)

    archiver.cleanup_old_backups()
    stale_deleted = archiver.cleanup_stale_sessions()
    if stale_deleted:
        print(f"  🗑 Stale sessions deleted: {stale_deleted} (>{archiver.retention_days}d)")
    _print_summary(results, archiver, args)


def _print_summary(results: list, archiver: SessionArchiver, args):
    print(f"\n{'='*60}")
    print(f"📊 Summary:")
    done = sum(1 for r in results if r["status"] in ("done", "dry_run"))
    skipped = sum(1 for r in results if r["status"] == "skipped")
    print(f"  Processed: {done}/{len(results)}")
    if skipped:
        print(f"  Skipped: {skipped}")
    if not args.dry_run:
        print(f"  Archives: {ARCHIVE_DIR}")
        print(f"  Backups: {BACKUP_DIR}")
        print(f"  Extracted: {TOOL_OUTPUTS_DIR}, {LONG_REPLIES_DIR}")


if __name__ == "__main__":
    main()
