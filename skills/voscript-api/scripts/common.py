"""VoScript API client - shared configuration and HTTP helpers.

This module provides the ``VoScriptClient`` class that every helper script
in this package uses to talk to a running VoScript FastAPI server.

Auth:
    VoScript accepts either ``X-API-Key: <key>`` header or
    ``Authorization: Bearer <key>``. This client uses ``X-API-Key`` by default.

Environment variables (fallback when constructor args are omitted):
    VOSCRIPT_URL        Base URL of the VoScript server (e.g. http://localhost:7880)
    VOSCRIPT_API_KEY    API key registered on the server

Dependencies: stdlib + ``requests`` only.

Diagnostics:
    This module implements TicNote-style structured failure reports with
    multilingual (zh/en) output selected via the ``LANG`` / ``LANGUAGE``
    environment variables.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlparse

import requests


DEFAULT_TIMEOUT = 120  # seconds, for regular JSON requests
UPLOAD_TIMEOUT = 3600  # seconds, for multipart uploads (large audio files)


# ----------------------------------------------------------------------
# Multilingual message table
# ----------------------------------------------------------------------
def _detect_lang() -> str:
    """Detect UI language from environment. Defaults to English."""
    for var in ("LC_ALL", "LC_MESSAGES", "LANG", "LANGUAGE"):
        val = os.environ.get(var, "")
        if val:
            if val.lower().startswith("zh"):
                return "zh"
            # LANGUAGE can be a colon-separated list
            for part in val.split(":"):
                if part.lower().startswith("zh"):
                    return "zh"
            return "en"
    return "en"


LANG = _detect_lang()


MSGS: Dict[str, Dict[str, str]] = {
    "zh": {
        # Common framing
        "failure_title": "❌ 请求失败",
        "status_label": "HTTP 状态",
        "error_label": "错误信息",
        "target_label": "目标",
        "checklist_title": "📋 请逐项确认:",
        "hints_title": "🔍 诊断提示:",
        "connecting": "🔗 正在连接 VoScript 服务器",
        "connected": "✓ 已连接",
        "sending": "🚀 正在发送请求",
        "done": "🎯 完成",
        # Status interpretations
        "http_400": "请求参数错误（服务器拒绝了请求体/表单内容）",
        "http_401": "API Key 无效或缺失（检查 VOSCRIPT_API_KEY 或 --api-key）",
        "http_403": "API Key 权限不足或被服务器拒绝",
        "http_404": "资源不存在（检查 tr_id / speaker_id / job_id 是否正确）",
        "http_409": "资源冲突（可能重复创建或状态不允许）",
        "http_413": "上传内容过大（检查文件大小或服务器 client_max_body_size）",
        "http_422": "请求校验失败（表单字段类型/必填项不符合服务器期望）",
        "http_429": "请求频率过高，被限流",
        "http_500": "服务器内部错误（请查看服务器日志 docker logs voscript）",
        "http_502": "网关错误（反代或上游服务挂掉了）",
        "http_503": "服务暂不可用（可能正在启动或模型未加载完毕）",
        "http_504": "网关超时（任务耗时超过反代超时阈值）",
        # URL diagnostics
        "url_empty": "服务器 URL 为空（请通过 --url 或 VOSCRIPT_URL 提供）",
        "url_no_scheme": "URL 缺少协议（必须以 http:// 或 https:// 开头）",
        "url_trailing_slash_note": "URL 末尾的斜杠会被自动去除",
        "url_localhost_note": "使用 localhost/127.0.0.1 时请确保服务运行在本机",
        # API key diagnostics
        "key_empty": "API Key 为空（请通过 --api-key 或 VOSCRIPT_API_KEY 提供）",
        "key_has_space": "API Key 中含有空白字符（可能被复制粘贴时带入，请清理）",
        "key_too_short": "API Key 长度异常（通常应为较长的字符串）",
        # Checklist items
        "chk_url": "□ VoScript 服务器 URL 是否正确（包含 http:// 协议）",
        "chk_key": "□ API Key 是否与服务器 /data/voscript/keys 匹配",
        "chk_network": "□ 网络是否连通（尝试 curl $VOSCRIPT_URL/healthz）",
        "chk_running": "□ 服务器是否在运行（ssh 进去看 docker ps 是否有 voscript）",
        # File diagnostics
        "file_missing": "文件不存在",
        "file_not_readable": "文件无读取权限",
        "file_empty": "文件为空（0 字节）",
        "file_ext_warn": "文件扩展名不像音频（常见: mp3/m4a/wav/flac/ogg/webm）",
        "file_size_warn": "文件较大（>500MB），上传可能耗时较久",
        # Submit
        "uploading": "📤 正在上传音频文件",
        "dedup_notice": "✓ 此音频已被转写过（SHA-256 去重），直接返回已有结果",
        "job_queued": "✓ 转写任务已入队",
        "job_id_label": "任务 ID",
        "status_label_short": "状态",
        # Poll
        "job_id_format_bad": "job_id 格式不符合预期（应匹配 tr_[A-Za-z0-9_-]{1,64}）",
        "stage_queued": "queued: 排队中",
        "stage_converting": "converting: 转换音频格式",
        "stage_denoising": "denoising: 降噪处理",
        "stage_transcribing": "transcribing: 语音识别",
        "stage_identifying": "identifying: 说话人识别",
        "stage_completed": "completed: 完成",
        "stage_failed": "failed: 失败",
        "stage_error": "error: 出错",
        "timeout_reached": "已达到超时时间",
        "timeout_advice": "建议：提高 --timeout 或检查服务器日志（docker logs voscript）",
        "polling": "⏳ 正在轮询任务状态",
        # Fetch result
        "segments_count": "片段数",
        "speakers_count": "说话人数",
        "speaker_map_header": "说话人映射:",
        "speaker_map_empty": "（暂无说话人映射）",
        "as_norm_note": (
            "⚠️ similarity 是 AS-norm z-score，非概率值（范围约 -1 到 2）。"
            "典型匹配阈值约为 0.5；越大越可信。"
        ),
        "speaker_not_enrolled": "（该说话人尚未注册声纹）",
        # Export
        "format_invalid": "format 必须是 srt / txt / json 之一",
        "wrote_bytes": "✓ 已写入 {n} 字节到 {path}",
        # Voiceprint enroll
        "enroll_label_warn_title": "❗ 常见错误：speaker_label 必须是 pyannote 的原始标签",
        "enroll_label_warn_body": (
            "   （例如 SPEAKER_00），不是说话人的显示名字。\n"
            '   ✗ 错误示例: --speaker-label "张三"\n'
            '   ✓ 正确示例: --speaker-label "SPEAKER_00"\n'
            "   speaker_label 来自 fetch_result 输出的 segment.speaker_label 字段。"
        ),
        "enroll_created": "✓ 声纹已新建",
        "enroll_updated": "✓ 声纹已更新",
        # List voiceprints
        "vp_single_sample": "⚠️ 单样本声纹，匹配阈值会自动降低 0.05",
        "vp_spread_high": "⚠️ 声纹分散度较高（>0.2），建议补充更多样本",
        "vp_empty": "（暂无声纹）",
        # Manage voiceprint delete
        "delete_warn": "⚠️ 声纹删除不可恢复，将同时删除所有已注册样本",
        "delete_confirm_prompt": "确认删除 speaker_id={sid}? 输入 yes 继续: ",
        "delete_aborted": "已取消",
        "delete_done": "✓ 声纹 {sid} 已删除",
        "rename_done": "✓ 声纹 {sid} 已改名为: {name}",
        # List transcriptions
        "tr_empty": "（暂无转写任务）",
        # Rebuild cohort
        "cohort_when_to_use": (
            "ℹ️ 建议在注册 10 个以上说话人后执行，以获得最佳 AS-norm 评分效果。"
        ),
        "cohort_rebuilt": "✓ Cohort 重建完成",
        "cohort_size_label": "cohort 大小",
        "cohort_skipped_label": "已跳过",
        "cohort_saved_label": "保存路径",
        "cohort_below_min": "⚠️ cohort 大小小于最低建议值 10，AS-norm 效果有限",
        "cohort_below_optimal": "ℹ️ cohort 大小未达最佳值 50，可继续注册更多声纹",
        "cohort_ok": "✓ cohort 大小充足",
        # Assign speaker
        "assign_done": "✓ 片段 {sid} 已分配给 {name}",
    },
    "en": {
        "failure_title": "❌ Request failed",
        "status_label": "HTTP status",
        "error_label": "Error",
        "target_label": "Target",
        "checklist_title": "📋 Please verify each item:",
        "hints_title": "🔍 Diagnostic hints:",
        "connecting": "🔗 Connecting to VoScript server",
        "connected": "✓ Connected",
        "sending": "🚀 Sending request",
        "done": "🎯 Done",
        "http_400": "Bad request (server rejected request body/form)",
        "http_401": "Invalid or missing API key (check VOSCRIPT_API_KEY or --api-key)",
        "http_403": "API key is valid but not authorized for this endpoint",
        "http_404": "Resource not found (verify tr_id / speaker_id / job_id)",
        "http_409": "Conflict (duplicate creation or state does not allow this action)",
        "http_413": "Upload too large (check file size or server client_max_body_size)",
        "http_422": "Validation failed (form field types/required fields mismatch)",
        "http_429": "Too many requests, rate limited",
        "http_500": "Internal server error (check `docker logs voscript`)",
        "http_502": "Bad gateway (reverse proxy or upstream service is down)",
        "http_503": "Service unavailable (server starting up or models still loading)",
        "http_504": "Gateway timeout (job exceeded reverse-proxy timeout)",
        "url_empty": "Server URL is empty (pass --url or set VOSCRIPT_URL)",
        "url_no_scheme": "URL missing scheme (must start with http:// or https://)",
        "url_trailing_slash_note": "Trailing slash will be stripped automatically",
        "url_localhost_note": "When using localhost/127.0.0.1 the server must run on this machine",
        "key_empty": "API key is empty (pass --api-key or set VOSCRIPT_API_KEY)",
        "key_has_space": "API key contains whitespace (likely copy-paste artifact, clean it up)",
        "key_too_short": "API key is unusually short (expected a longer string)",
        "chk_url": "□ VoScript server URL correct (includes http:// scheme)",
        "chk_key": "□ API key matches the server at /data/voscript/keys",
        "chk_network": "□ Network is reachable (try curl $VOSCRIPT_URL/healthz)",
        "chk_running": "□ Server is running (ssh in and check `docker ps` for voscript)",
        "file_missing": "File does not exist",
        "file_not_readable": "File is not readable",
        "file_empty": "File is empty (0 bytes)",
        "file_ext_warn": "File extension does not look like audio (expected mp3/m4a/wav/flac/ogg/webm)",
        "file_size_warn": "File is large (>500MB); upload may take a while",
        "uploading": "📤 Uploading audio file",
        "dedup_notice": "✓ Audio already transcribed (SHA-256 dedup); existing result returned",
        "job_queued": "✓ Transcription job queued",
        "job_id_label": "Job ID",
        "status_label_short": "Status",
        "job_id_format_bad": "job_id format is invalid (expected tr_[A-Za-z0-9_-]{1,64})",
        "stage_queued": "queued: waiting",
        "stage_converting": "converting: transcoding audio",
        "stage_denoising": "denoising: noise reduction",
        "stage_transcribing": "transcribing: ASR in progress",
        "stage_identifying": "identifying: speaker identification",
        "stage_completed": "completed: done",
        "stage_failed": "failed",
        "stage_error": "error",
        "timeout_reached": "Timeout reached",
        "timeout_advice": "Advice: increase --timeout or inspect server logs (docker logs voscript)",
        "polling": "⏳ Polling job status",
        "segments_count": "segments",
        "speakers_count": "speakers",
        "speaker_map_header": "Speaker map:",
        "speaker_map_empty": "(speaker map is empty)",
        "as_norm_note": (
            "⚠️ similarity is an AS-norm z-score, not a probability (range approx -1 to 2). "
            "Typical match threshold ~0.5; higher = more confident."
        ),
        "speaker_not_enrolled": "(this speaker has no enrolled voiceprint)",
        "format_invalid": "format must be one of srt / txt / json",
        "wrote_bytes": "✓ Wrote {n} bytes to {path}",
        "enroll_label_warn_title": "❗ Common pitfall: speaker_label must be the original pyannote label",
        "enroll_label_warn_body": (
            "   (e.g. SPEAKER_00), NOT the speaker's display name.\n"
            '   ✗ Wrong: --speaker-label "Alice"\n'
            '   ✓ Right: --speaker-label "SPEAKER_00"\n'
            "   speaker_label comes from the segment.speaker_label field in fetch_result output."
        ),
        "enroll_created": "✓ Voiceprint created",
        "enroll_updated": "✓ Voiceprint updated",
        "vp_single_sample": "⚠️ Single-sample voiceprint; matching threshold is auto-lowered by 0.05",
        "vp_spread_high": "⚠️ High sample spread (>0.2); consider enrolling more samples",
        "vp_empty": "(no voiceprints)",
        "delete_warn": "⚠️ Voiceprint deletion is irreversible; all enrolled samples will also be removed",
        "delete_confirm_prompt": "Confirm deleting speaker_id={sid}? Type yes to continue: ",
        "delete_aborted": "Aborted",
        "delete_done": "✓ Voiceprint {sid} deleted",
        "rename_done": "✓ Voiceprint {sid} renamed to: {name}",
        "tr_empty": "(no transcriptions)",
        "cohort_when_to_use": (
            "ℹ️ Recommended after enrolling 10+ speakers, for best AS-norm scoring quality."
        ),
        "cohort_rebuilt": "✓ Cohort rebuilt",
        "cohort_size_label": "cohort size",
        "cohort_skipped_label": "skipped",
        "cohort_saved_label": "saved to",
        "cohort_below_min": "⚠️ cohort size below recommended minimum 10; AS-norm effect limited",
        "cohort_below_optimal": "ℹ️ cohort size below optimal 50; enroll more voiceprints for best results",
        "cohort_ok": "✓ cohort size is healthy",
        "assign_done": "✓ Segment {sid} assigned to {name}",
    },
}


def t(key: str, **fmt: Any) -> str:
    """Return the localized string for ``key``, falling back to English."""
    table = MSGS.get(LANG) or MSGS["en"]
    text = table.get(key) or MSGS["en"].get(key) or key
    if fmt:
        try:
            return text.format(**fmt)
        except (KeyError, IndexError):
            return text
    return text


# ----------------------------------------------------------------------
# Diagnostic helpers (also usable from scripts)
# ----------------------------------------------------------------------
def diagnose_url(url: Optional[str]) -> List[str]:
    """Return a list of human-readable hints about the URL value."""
    hints: List[str] = []
    if not url:
        hints.append(t("url_empty"))
        return hints
    if "://" not in url:
        hints.append(t("url_no_scheme"))
    else:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            hints.append(t("url_no_scheme"))
        host = (parsed.hostname or "").lower()
        if host in ("localhost", "127.0.0.1", "::1"):
            hints.append(t("url_localhost_note"))
    if url.endswith("/"):
        hints.append(t("url_trailing_slash_note"))
    return hints


def diagnose_api_key(key: Optional[str]) -> List[str]:
    """Return a list of human-readable hints about the API key value."""
    hints: List[str] = []
    if not key:
        hints.append(t("key_empty"))
        return hints
    if any(ch.isspace() for ch in key):
        hints.append(t("key_has_space"))
    if len(key.strip()) < 6:
        hints.append(t("key_too_short"))
    return hints


def interpret_http_status(status: int) -> str:
    """Map an HTTP status code to a localized explanation string."""
    key = f"http_{status}"
    if key in MSGS["en"]:
        return t(key)
    if 500 <= status < 600:
        return t("http_500")
    return ""


def print_failure_report(
    target: str,
    status: Optional[int],
    error: str,
    extra_hints: Optional[List[str]] = None,
    stream: Any = None,
) -> None:
    """Print a TicNote-style structured failure report to stderr."""
    import sys

    out = stream if stream is not None else sys.stderr

    print("", file=out)
    print(t("failure_title"), file=out)
    print(f"🔗 {t('target_label')}: {target}", file=out)
    if status is not None:
        interp = interpret_http_status(status)
        status_text = f"{status}" + (f"  —  {interp}" if interp else "")
        print(f"   {t('status_label')}: {status_text}", file=out)
    if error:
        print(f"   {t('error_label')}: {error}", file=out)

    hints: List[str] = []
    if extra_hints:
        hints.extend(h for h in extra_hints if h)

    if hints:
        print("", file=out)
        print(t("hints_title"), file=out)
        for h in hints:
            print(f"  • {h}", file=out)

    print("", file=out)
    print(t("checklist_title"), file=out)
    for k in ("chk_url", "chk_key", "chk_network", "chk_running"):
        print(f"  {t(k)}", file=out)
    print("", file=out)


# ----------------------------------------------------------------------
# Error class
# ----------------------------------------------------------------------
class VoScriptError(RuntimeError):
    """Raised when the VoScript server returns a non-2xx response."""

    def __init__(self, status_code: int, message: str, payload: Any = None) -> None:
        super().__init__(f"[{status_code}] {message}")
        self.status_code = status_code
        self.message = message
        self.payload = payload


# ----------------------------------------------------------------------
# Client
# ----------------------------------------------------------------------
class VoScriptClient:
    """VoScript API client - configuration and HTTP helpers.

    Parameters
    ----------
    url:
        Base URL of the VoScript server. Falls back to ``$VOSCRIPT_URL``.
    api_key:
        API key. Falls back to ``$VOSCRIPT_API_KEY``.
    timeout:
        Default request timeout in seconds (used for non-upload requests).
    """

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        resolved_url = url or os.environ.get("VOSCRIPT_URL")
        resolved_key = api_key or os.environ.get("VOSCRIPT_API_KEY")

        if not resolved_url:
            raise ValueError(t("url_empty"))
        if not resolved_key:
            raise ValueError(t("key_empty"))

        self.url = resolved_url.rstrip("/")
        self.api_key = resolved_key
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {
                "X-API-Key": self.api_key,
                "Accept": "application/json",
            }
        )

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------
    def diagnose(self) -> List[str]:
        """Return non-fatal hints about the current URL + API key pair."""
        hints = diagnose_url(self.url)
        hints.extend(diagnose_api_key(self.api_key))
        return hints

    def health_check(self) -> Tuple[bool, str]:
        """Call ``GET /healthz``. Returns ``(ok, info_string)``.

        This never raises — it returns a best-effort hint instead so callers
        can surface it in a failure report.
        """
        try:
            resp = self._session.get(
                self._build_url("/healthz"), timeout=min(10, self.timeout)
            )
            if resp.status_code == 200:
                return True, f"/healthz {resp.status_code}"
            return False, f"/healthz {resp.status_code}"
        except requests.RequestException as exc:
            return False, f"/healthz unreachable: {exc.__class__.__name__}"

    # ------------------------------------------------------------------
    # Low-level helpers
    # ------------------------------------------------------------------
    def _build_url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if not path.startswith("/"):
            path = "/" + path
        return self.url + path

    def _parse_response(self, resp: requests.Response) -> Any:
        if resp.status_code >= 400:
            try:
                payload = resp.json()
                message = payload.get("detail") or payload.get("message") or resp.text
            except ValueError:
                payload = None
                message = resp.text or resp.reason
            raise VoScriptError(resp.status_code, str(message), payload)

        if not resp.content:
            return None

        content_type = resp.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                return resp.json()
            except ValueError:
                return resp.text
        return resp.text

    # ------------------------------------------------------------------
    # Public HTTP methods
    # ------------------------------------------------------------------
    def get(
        self, path: str, params: Optional[Dict[str, Any]] = None, **kwargs: Any
    ) -> Any:
        resp = self._session.get(
            self._build_url(path),
            params=params,
            timeout=kwargs.pop("timeout", self.timeout),
            **kwargs,
        )
        return self._parse_response(resp)

    def post(
        self,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        # Larger timeout when uploading files
        default_timeout = UPLOAD_TIMEOUT if files else self.timeout
        resp = self._session.post(
            self._build_url(path),
            data=data,
            files=files,
            json=json_body,
            timeout=kwargs.pop("timeout", default_timeout),
            **kwargs,
        )
        return self._parse_response(resp)

    def put(
        self,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        resp = self._session.put(
            self._build_url(path),
            data=data,
            json=json_body,
            timeout=kwargs.pop("timeout", self.timeout),
            **kwargs,
        )
        return self._parse_response(resp)

    def delete(self, path: str, **kwargs: Any) -> Any:
        resp = self._session.delete(
            self._build_url(path),
            timeout=kwargs.pop("timeout", self.timeout),
            **kwargs,
        )
        return self._parse_response(resp)

    def download(
        self, path: str, params: Optional[Dict[str, Any]] = None
    ) -> Tuple[bytes, str]:
        """Download binary content. Returns ``(bytes, suggested_filename)``."""
        resp = self._session.get(
            self._build_url(path),
            params=params,
            timeout=self.timeout,
            stream=False,
        )
        if resp.status_code >= 400:
            try:
                payload = resp.json()
                message = payload.get("detail") or payload.get("message") or resp.text
            except ValueError:
                payload = None
                message = resp.text or resp.reason
            raise VoScriptError(resp.status_code, str(message), payload)

        filename = _filename_from_content_disposition(
            resp.headers.get("content-disposition", "")
        )
        return resp.content, filename


# ----------------------------------------------------------------------
# CLI helpers reused by every script
# ----------------------------------------------------------------------
def add_common_args(parser: "object") -> None:
    """Attach ``--url`` and ``--api-key`` to an ``argparse.ArgumentParser``.

    Typed as ``object`` to avoid importing argparse at module import time
    (scripts import argparse themselves).
    """
    parser.add_argument(
        "--url",
        default=None,
        help="VoScript server base URL (falls back to $VOSCRIPT_URL).",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="VoScript API key (falls back to $VOSCRIPT_API_KEY).",
    )


def build_client_from_args(args: Any) -> VoScriptClient:
    """Build a ``VoScriptClient`` from parsed argparse args."""
    return VoScriptClient(url=args.url, api_key=args.api_key)


def build_client_with_diagnostics(args: Any) -> VoScriptClient:
    """Build client and surface any pre-flight hints on stderr.

    Unlike :func:`build_client_from_args` this prints non-fatal hints
    (e.g. trailing slash, whitespace in API key) to stderr before
    returning the client. Fatal problems still raise ``ValueError``.
    """
    import sys

    raw_url = args.url or os.environ.get("VOSCRIPT_URL")
    raw_key = args.api_key or os.environ.get("VOSCRIPT_API_KEY")
    pre_hints: List[str] = []
    pre_hints.extend(diagnose_url(raw_url))
    pre_hints.extend(diagnose_api_key(raw_key))
    # Only show hints for non-fatal issues (URL + key exist)
    if raw_url and raw_key and pre_hints:
        print(t("hints_title"), file=sys.stderr)
        for h in pre_hints:
            print(f"  • {h}", file=sys.stderr)
    return VoScriptClient(url=args.url, api_key=args.api_key)


def print_json(value: Any) -> None:
    """Print a value as pretty JSON (UTF-8, no ASCII escaping)."""
    print(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=False))


def format_hms(seconds: float) -> str:
    """Format a number of seconds as ``HH:MM:SS.mmm`` (SRT-ish)."""
    if seconds is None:
        return "--:--:--.---"
    total_ms = int(round(float(seconds) * 1000))
    hours, rem = divmod(total_ms, 3600 * 1000)
    minutes, rem = divmod(rem, 60 * 1000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def _filename_from_content_disposition(header: str) -> str:
    """Extract filename from ``Content-Disposition`` header, else empty string."""
    if not header:
        return ""
    parts: Iterable[str] = (p.strip() for p in header.split(";"))
    for part in parts:
        if part.lower().startswith("filename*="):
            # RFC 5987: filename*=UTF-8''encoded-name
            value = part.split("=", 1)[1]
            if "''" in value:
                value = value.split("''", 1)[1]
            return value.strip().strip('"')
        if part.lower().startswith("filename="):
            return part.split("=", 1)[1].strip().strip('"')
    return ""


# ----------------------------------------------------------------------
# Script helper: convert an exception into a full failure report
# ----------------------------------------------------------------------
def report_exception(
    target: str,
    exc: BaseException,
    extra_hints: Optional[List[str]] = None,
    client: Optional[VoScriptClient] = None,
    probe_health: bool = True,
) -> None:
    """Write a structured failure report for ``exc`` to stderr.

    - Maps ``VoScriptError`` to the corresponding HTTP status interpretation.
    - Optionally performs a ``/healthz`` probe and appends the result as a hint.
    """
    hints: List[str] = []
    if extra_hints:
        hints.extend(extra_hints)

    status: Optional[int] = None
    message: str

    if isinstance(exc, VoScriptError):
        status = exc.status_code
        message = exc.message
    elif isinstance(exc, requests.exceptions.ConnectionError):
        message = f"ConnectionError: {exc}"
        if client is not None:
            hints.extend(client.diagnose())
    elif isinstance(exc, requests.exceptions.Timeout):
        message = f"Timeout: {exc}"
    elif isinstance(exc, ValueError):
        message = str(exc)
    else:
        message = f"{exc.__class__.__name__}: {exc}"

    if (
        probe_health
        and client is not None
        and isinstance(exc, (requests.exceptions.RequestException, VoScriptError))
    ):
        ok, info = client.health_check()
        hints.append(("✓ " if ok else "✗ ") + info)

    print_failure_report(target=target, status=status, error=message, extra_hints=hints)


__all__ = [
    "LANG",
    "MSGS",
    "t",
    "diagnose_url",
    "diagnose_api_key",
    "interpret_http_status",
    "print_failure_report",
    "report_exception",
    "VoScriptClient",
    "VoScriptError",
    "add_common_args",
    "build_client_from_args",
    "build_client_with_diagnostics",
    "print_json",
    "format_hms",
]
