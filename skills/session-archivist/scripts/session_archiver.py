#!/usr/bin/env python3
"""
Session Archivist — 会话生命周期管理
扫描大 session 文件，提取关键信息，归档，裁剪。

用法:
    python3 session_archiver.py                    # 执行归档
    python3 session_archiver.py --dry-run          # 只检测不修改
    python3 session_archiver.py --session-id XXX   # 只处理指定 session
    python3 session_archiver.py --max-size 2048    # 自定义阈值 (KB)
"""

import json
import os
import sys
import re
import hashlib
import shutil
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ─── 默认配置 ───────────────────────────────────────────────────────────

HERMES_HOME = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
SESSIONS_DIR = HERMES_HOME / "sessions"
ARCHIVE_DIR = HERMES_HOME / "session-archives"
BACKUP_DIR = ARCHIVE_DIR / "backups"
CONFIG_PATH = HERMES_HOME / "config.yaml"

DEFAULT_MAX_SIZE_KB = 1024
DEFAULT_TARGET_SIZE_KB = 512
DEFAULT_IMPORTANCE_THRESHOLD = 0.5
DEFAULT_KEEP_RECENT = 20
BACKUP_RETENTION_DAYS = 7


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


# ─── 重要性评分 ─────────────────────────────────────────────────────────

class ImportanceScorer:
    """消息重要性评分器"""

    # 决策关键词
    DECISION_PATTERNS = [
        r'决定[用采]', r'选择了', r'方案是', r'确定[用采]',
        r'we\s+(?:decide|choose|will)\s+', r'let\'s\s+go\s+with',
        r'方案[一二三]', r'最终[选确]', r'结论是',
    ]

    # 错误修复模式
    ERROR_PATTERNS = [
        r'(?:error|错误|bug|问题|失败|异常)[：:]\s*.{10,}',
        r'(?:fixed|修复|解决了|搞定了)',
        r'(?:root\s*cause|根因)[：:]',
        r'(?:solution|解决方案|修法)[：:]',
    ]

    # 待办模式
    TODO_PATTERNS = [
        r'(?:TODO|FIXME|待办|待完成|还需要)[：:]',
        r'(?:下一步|接下来|计划)[：:]',
        r'- \[ \]',  # markdown checkbox
    ]

    # 用户偏好模式
    PREFERENCE_PATTERNS = [
        r'(?:我喜欢|我偏好|我习惯|我希望|请不要|以后不要)',
        r'(?:I\s+prefer|I\s+like|please\s+don\'t|in\s+the\s+future)',
        r'(?:记住|以后都|每次都|不要)',
    ]

    # 代码模式
    CODE_PATTERN = r'```[\s\S]{20,}?```'

    # 工具调用模式
    TOOL_PATTERNS = [
        r'(?:file_path|path|command|endpoint|url)[：:=]\s*[`"\']?[/\w]',
        r'(?:API|接口|端点)[：:]',
    ]

    def score_message(self, msg: dict) -> float:
        """对单条消息评分，返回 0-1"""
        role = msg.get("role", "")
        content = msg.get("content", "")

        if not content or not isinstance(content, str):
            return 0.0

        score = 0.0

        # 简单问候 → 最低分
        if self._is_greeting(content):
            return 0.0

        # 决策
        if self._match_patterns(content, self.DECISION_PATTERNS):
            score += 0.3

        # 错误修复
        if self._match_patterns(content, self.ERROR_PATTERNS):
            score += 0.25

        # 待办
        if self._match_patterns(content, self.TODO_PATTERNS):
            score += 0.1

        # 用户偏好
        if self._match_patterns(content, self.PREFERENCE_PATTERNS):
            score += 0.15

        # 代码
        if re.search(self.CODE_PATTERN, content):
            score += 0.2

        # 工具调用结果
        if role == "tool" and self._match_patterns(content, self.TOOL_PATTERNS):
            score += 0.1

        # 用户消息加权
        if role == "user":
            score *= 1.2

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
    """检测会话中的话题切换点"""

    # 话题切换信号
    TRANSITION_SIGNALS = [
        r'(?:现在|接下来|下一个|新[的任]|另外)',
        r'(?:换[个一]|切换到|转到)',
        r'(?:now|next|let\'s|switch\s+to|moving\s+on)',
        r'(?:好的[，,]\s*(?:那|我们))',
    ]

    def detect_boundaries(self, messages: list, time_gap_hours: float = 2.0) -> list:
        """
        检测话题切换点，返回边界索引列表。
        边界 = 新话题开始的消息索引。
        """
        boundaries = []
        prev_timestamp = None

        for i, msg in enumerate(messages):
            if i == 0:
                continue

            # 时间间隔检测
            timestamp = msg.get("timestamp", 0)
            if prev_timestamp and timestamp:
                gap_hours = (timestamp - prev_timestamp) / 3600
                if gap_hours >= time_gap_hours:
                    boundaries.append(i)
                    prev_timestamp = timestamp
                    continue

            # 话题切换信号检测
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
    """从高分消息生成结构化摘要"""

    def generate(self, messages: list, scores: list, session_meta: dict) -> str:
        """生成结构化 markdown 摘要"""
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        title = session_meta.get("title", "Untitled")
        session_id = session_meta.get("session_id", "unknown")

        # 分类提取
        decisions = self._extract_decisions(messages, scores)
        completed = self._extract_completed(messages, scores)
        errors = self._extract_errors(messages, scores)
        todos = self._extract_todos(messages, scores)
        intent = self._extract_intent(messages)
        references = self._extract_references(messages)

        # 统计
        total = len(messages)
        high_score = sum(1 for s in scores if s >= 0.5)

        md = f"""# Session Archive: {title}

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
        return md

    def _extract_intent(self, messages: list) -> str:
        """提取用户意图（前几条用户消息）"""
        user_msgs = [m for m in messages[:20] if m.get("role") == "user" and m.get("content")]
        if not user_msgs:
            return "_(no user messages found)_"
        first = user_msgs[0].get("content", "")[:500]
        return f'> {first}'

    def _extract_decisions(self, messages: list, scores: list) -> str:
        decisions = []
        for msg, score in zip(messages, scores):
            if score < 0.3:
                continue
            content = msg.get("content", "")
            if not isinstance(content, str):
                continue
            # 提取决策相关句子
            for line in content.split("\n"):
                line = line.strip()
                if any(kw in line for kw in ["决定", "选择", "方案", "确定", "结论"]):
                    if len(line) > 10:
                        decisions.append(f"- {line[:200]}")
        return "\n".join(decisions[:10])

    def _extract_completed(self, messages: list, scores: list) -> str:
        items = []
        for msg, score in zip(messages, scores):
            if score < 0.2:
                continue
            content = msg.get("content", "")
            if not isinstance(content, str):
                continue
            for line in content.split("\n"):
                line = line.strip()
                if any(kw in line for kw in ["✅", "完成", "已修复", "fixed", "done", "成功"]):
                    items.append(f"- [x] {line[:200]}")
        return "\n".join(items[:10])

    def _extract_errors(self, messages: list, scores: list) -> str:
        errors = []
        for msg, score in zip(messages, scores):
            if score < 0.25:
                continue
            content = msg.get("content", "")
            if not isinstance(content, str):
                continue
            for line in content.split("\n"):
                line = line.strip()
                if any(kw in line.lower() for kw in ["error", "错误", "bug", "问题", "失败"]):
                    if len(line) > 15:
                        errors.append(f"| {line[:100]} | |")
        if not errors:
            return ""
        header = "| Error | Solution |\n|-------|----------|"
        return header + "\n" + "\n".join(errors[:5])

    def _extract_todos(self, messages: list, scores: list) -> str:
        todos = []
        for msg, score in zip(messages, scores):
            content = msg.get("content", "")
            if not isinstance(content, str):
                continue
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
            if not isinstance(content, str):
                continue
            # 文件路径
            for match in re.finditer(r'(?:/home|/tmp|~/|/mnt/)[^\s`"\']+\.(?:py|js|md|yaml|json|sh|txt)', content):
                refs.add(f"- File: `{match.group()}`")
            # API endpoints
            for match in re.finditer(r'https?://[^\s`"\']+', content):
                url = match.group()
                if "localhost" in url or "127.0.0.1" in url:
                    refs.add(f"- API: `{url}`")
        return "\n".join(list(refs)[:10])


# ─── 去重引擎 ───────────────────────────────────────────────────────────

class DedupEngine:
    """检测和去除重复记忆"""

    def __init__(self, hindsight_url: Optional[str] = None):
        self.hindsight_url = hindsight_url
        self._existing_hashes = set()

    def load_existing(self, bank_id: str = "default"):
        """从 Hindsight 加载已有记忆的哈希"""
        if not self.hindsight_url:
            return
        try:
            import urllib.request
            url = f"{self.hindsight_url}/v1/default/banks/{bank_id}/memories"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                for mem in data.get("memories", []):
                    content = mem.get("content", "")
                    h = hashlib.md5(content.encode()).hexdigest()
                    self._existing_hashes.add(h)
        except Exception:
            pass

    def is_duplicate(self, content: str) -> bool:
        """检查内容是否已存在"""
        h = hashlib.md5(content.encode()).hexdigest()
        return h in self._existing_hashes

    def mark_stored(self, content: str):
        """标记内容已存储"""
        h = hashlib.md5(content.encode()).hexdigest()
        self._existing_hashes.add(h)


# ─── Hindsight 集成 ─────────────────────────────────────────────────────

class HindsightClient:
    """Hindsight 记忆库客户端"""

    def __init__(self, url: str = "http://127.0.0.1:8888"):
        self.url = url.rstrip("/")
        self._available = None

    def is_available(self) -> bool:
        if self._available is not None:
            return self._available
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
        """获取或创建 bank，返回 bank_id"""
        import urllib.request
        # 先查找
        req = urllib.request.Request(f"{self.url}/v1/default/banks")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            for bank in data.get("banks", []):
                if bank.get("name") == name:
                    return bank["bank_id"]
        # 创建（用 PUT，Hindsight API 要求）
        payload = json.dumps({"name": name, "description": f"Session archives for {name}"}).encode()
        req = urllib.request.Request(
            f"{self.url}/v1/default/banks/{name}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return data["bank_id"]

    def store_memory(self, bank_id: str, content: str, metadata: dict, tags: list) -> str:
        """存入记忆，返回 memory_id"""
        import urllib.request
        # Hindsight API: POST /banks/{bank_id}/memories with items array
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
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            # Hindsight returns {success, bank_id, items_count, usage}
            if data.get("success"):
                return f"bank:{bank_id}:stored"
            return ""


# ─── 安全检查 ───────────────────────────────────────────────────────────

import fcntl
import time

# 活跃会话判定：最近 N 秒有更新的 session 跳过
ACTIVE_THRESHOLD_SECONDS = 300  # 5 分钟


def is_session_active(session_path: Path) -> bool:
    """检查 session 是否活跃（最近有更新）"""
    try:
        mtime = session_path.stat().st_mtime
        return (time.time() - mtime) < ACTIVE_THRESHOLD_SECONDS
    except Exception:
        return True  # 无法判断时保守跳过


def get_running_agent_sessions() -> set:
    """获取当前正在运行的 agent session ID 集合"""
    running = set()
    try:
        # 检查 hermes gateway 进程
        import subprocess
        result = subprocess.run(
            ["pgrep", "-a", "-f", "hermes_cli.main gateway"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            # gateway 在运行，从日志中获取活跃 session
            gateway_log = HERMES_HOME / "logs" / "gateway.log"
            if gateway_log.exists():
                # 读取最近 100 行，提取 session key
                with open(gateway_log) as f:
                    lines = f.readlines()[-100:]
                for line in lines:
                    if "inbound message:" in line:
                        # 提取 chat=xxx 作为 session 标识
                        match = re.search(r'chat=(\S+)', line)
                        if match:
                            running.add(match.group(1))
    except Exception:
        pass
    return running


def is_gateway_busy() -> bool:
    """检查 gateway 是否正在处理消息"""
    try:
        import subprocess
        # 检查是否有 hermes agent 进程正在运行
        result = subprocess.run(
            ["pgrep", "-f", "run_agent"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


def acquire_file_lock(session_path: Path) -> bool:
    """尝试获取文件锁，防止并发写入"""
    lock_path = session_path.with_suffix(".lock")
    try:
        # 创建锁文件
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
    """释放文件锁"""
    if lock_fd:
        try:
            fcntl.flock(lock_fd.fileno(), fcntl.LOCK_UN)
            lock_fd.close()
        except Exception:
            pass


# ─── 核心归档器 ─────────────────────────────────────────────────────────

class SessionArchiver:
    """Session 归档核心逻辑"""

    def __init__(self, config: dict):
        self.max_size_kb = config.get("max_session_size_kb", DEFAULT_MAX_SIZE_KB)
        self.target_size_kb = config.get("target_session_size_kb", DEFAULT_TARGET_SIZE_KB)
        self.importance_threshold = config.get("importance_threshold", DEFAULT_IMPORTANCE_THRESHOLD)
        self.keep_recent = config.get("keep_recent", DEFAULT_KEEP_RECENT)
        self.dry_run = config.get("dry_run", False)

        self.scorer = ImportanceScorer()
        self.detector = SessionDetector()
        self.generator = SummaryGenerator()
        self.dedup = DedupEngine()

        # Hindsight
        hindsight_url = config.get("hindsight_url", "http://127.0.0.1:8888")
        hindsight_enabled = config.get("hindsight_enabled", "auto")
        self.hindsight = HindsightClient(hindsight_url)
        if hindsight_enabled == "auto":
            self._hs_enabled = self.hindsight.is_available()
        elif hindsight_enabled is True:
            self._hs_enabled = True
        else:
            self._hs_enabled = False

        # 确保目录存在
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    def scan(self) -> list:
        """扫描大 session 文件，返回 [(path, size_kb, session_id)]"""
        results = []
        for f in SESSIONS_DIR.glob("session_*.json"):
            size_kb = f.stat().st_size / 1024
            if size_kb > self.max_size_kb:
                session_id = f.stem.replace("session_", "")
                results.append((f, size_kb, session_id))
        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def process_session(self, session_path: Path, session_id: str) -> dict:
        """处理单个 session：安全检查→分析→评分→归档→裁剪"""
        print(f"\n{'='*60}")
        print(f"Processing: {session_path.name}")
        print(f"Size: {session_path.stat().st_size / 1024:.0f} KB")

        # ── 安全检查 1: 跳过活跃会话 ──────────────────────────────
        if is_session_active(session_path):
            print(f"  ⏭ Skipped: session is active (modified within {ACTIVE_THRESHOLD_SECONDS}s)")
            return {"status": "skipped", "reason": "active_session"}

        # ── 安全检查 2: 检查 gateway 是否正在使用 ────────────────
        running_sessions = get_running_agent_sessions()
        # 从 session_id 提取可能的 chat_id 标识
        for running_id in running_sessions:
            if session_id in running_id or running_id in session_id:
                print(f"  ⏭ Skipped: agent is running for this session")
                return {"status": "skipped", "reason": "agent_running"}

        # ── 安全检查 3: gateway 繁忙检测 ─────────────────────────
        if is_gateway_busy() and not self.dry_run:
            print(f"  ⏭ Skipped: gateway is busy processing messages")
            return {"status": "skipped", "reason": "gateway_busy"}

        # ── 安全检查 4: 获取文件锁 ──────────────────────────────
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
                # 清理锁文件
                lock_path = session_path.with_suffix(".lock")
                lock_path.unlink(missing_ok=True)

    def _do_process(self, session_path: Path, session_id: str) -> dict:
        """实际处理逻辑（安全检查通过后调用）"""
        # 1. 加载 session
        with open(session_path) as f:
            data = json.load(f)

        messages = data.get("messages", [])
        title = data.get("title", "") or session_id
        if not messages:
            print("  ⚠ No messages found, skipping")
            return {"status": "skipped", "reason": "no_messages"}

        print(f"  Messages: {len(messages)}")

        # 2. 重要性评分
        scores = [self.scorer.score_message(m) for m in messages]
        high_count = sum(1 for s in scores if s >= self.importance_threshold)
        print(f"  High-importance messages: {high_count}")

        # 3. 会话边界检测
        boundaries = self.detector.detect_boundaries(messages)
        if boundaries:
            print(f"  Topic boundaries detected: {len(boundaries)}")

        # 4. 生成结构化摘要
        session_meta = {"title": title, "session_id": session_id}
        summary = self.generator.generate(messages, scores, session_meta)

        # 5. 存档
        archive_path = ARCHIVE_DIR / f"{session_id}.md"
        if self.dry_run:
            print(f"  [DRY-RUN] Would archive to: {archive_path}")
            print(f"  [DRY-RUN] Would trim to ~{self.keep_recent} messages")
        else:
            # 写入本地 markdown
            with open(archive_path, "w") as f:
                f.write(summary)
            print(f"  ✅ Archived to: {archive_path}")

            # Hindsight 存档
            if self._hs_enabled:
                try:
                    # 检测去重
                    if self.dedup.is_duplicate(summary):
                        print(f"  ⏭ Skipped Hindsight (duplicate)")
                    else:
                        bank_name = self._detect_project(title, session_id)
                        bank_id = self.hindsight.get_or_create_bank(bank_name)
                        memory_id = self.hindsight.store_memory(
                            bank_id=bank_id,
                            content=summary,
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

            # 6. 备份 + 裁剪
            backup_path = BACKUP_DIR / f"{session_id}_{datetime.now().strftime('%Y%m%d')}.json"
            shutil.copy2(session_path, backup_path)
            print(f"  📦 Backup: {backup_path}")

            trimmed = self._trim_session(data, messages, scores, summary)
            with open(session_path, "w") as f:
                json.dump(trimmed, f, ensure_ascii=False, indent=1)
            new_size = session_path.stat().st_size / 1024
            print(f"  ✂️ Trimmed: {len(messages)} → {len(trimmed.get('messages', []))} messages, {new_size:.0f} KB")

        return {
            "status": "dry_run" if self.dry_run else "done",
            "session_id": session_id,
            "original_messages": len(messages),
            "high_importance": high_count,
        }

    def _detect_project(self, title: str, session_id: str) -> str:
        """从标题检测项目名"""
        # 常见项目名模式 — 根据你的项目自行修改
        patterns = [
            r'project', r'backend', r'frontend', r'hermes',
        ]
        title_lower = title.lower()
        for p in patterns:
            if p.lower() in title_lower:
                return p
        # 从 session_id 提取日期作为分组
        return session_id[:8]

    def _trim_session(self, data: dict, messages: list, scores: list, summary: str) -> dict:
        """裁剪 session，保留最近 N 条 + 摘要上下文"""
        # 保留最近的消息
        keep_count = min(self.keep_recent, len(messages))
        recent_messages = messages[-keep_count:]

        # 构建摘要消息
        summary_msg = {
            "role": "system",
            "content": f"[Session Archivist] 此会话已被归档。以下是历史摘要：\n\n{summary[:2000]}",
            "timestamp": datetime.now(timezone.utc).timestamp(),
        }

        # 组装
        trimmed_messages = [summary_msg] + recent_messages
        data["messages"] = trimmed_messages
        data["_session_archivist"] = {
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "original_count": len(messages),
            "trimmed_count": len(trimmed_messages),
        }
        return data

    def cleanup_old_backups(self):
        """清理过期备份"""
        cutoff = datetime.now().timestamp() - (BACKUP_RETENTION_DAYS * 86400)
        count = 0
        for f in BACKUP_DIR.glob("*.json"):
            if f.stat().st_mtime < cutoff:
                if not self.dry_run:
                    f.unlink()
                count += 1
        if count:
            print(f"\n{'[DRY-RUN] ' if self.dry_run else ''}Cleaned up {count} old backups")


# ─── CLI 入口 ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Session Archivist — 会话生命周期管理")
    parser.add_argument("--dry-run", action="store_true", help="只检测不修改")
    parser.add_argument("--session-id", help="只处理指定 session")
    parser.add_argument("--max-size", type=int, help="最大 session 大小 (KB)")
    parser.add_argument("--target-size", type=int, help="裁剪目标大小 (KB)")
    parser.add_argument("--threshold", type=float, help="重要性阈值 (0-1)")
    parser.add_argument("--no-hindsight", action="store_true", help="禁用 Hindsight")
    parser.add_argument("--list", action="store_true", help="列出大 session 文件")
    args = parser.parse_args()

    # 加载配置
    config = load_config()
    if args.dry_run:
        config["dry_run"] = True
    if args.max_size:
        config["max_session_size_kb"] = args.max_size
    if args.target_size:
        config["target_session_size_kb"] = args.target_size
    if args.threshold:
        config["importance_threshold"] = args.threshold
    if args.no_hindsight:
        config["hindsight_enabled"] = False

    archiver = SessionArchiver(config)

    # 扫描
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

    # 处理
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

    # 清理旧备份
    archiver.cleanup_old_backups()

    # 汇总
    print(f"\n{'='*60}")
    print(f"📊 Summary:")
    done = sum(1 for r in results if r["status"] in ("done", "dry_run"))
    print(f"  Processed: {done}/{len(results)}")
    if not args.dry_run:
        print(f"  Archives saved to: {ARCHIVE_DIR}")
        print(f"  Backups saved to: {BACKUP_DIR}")


if __name__ == "__main__":
    main()
