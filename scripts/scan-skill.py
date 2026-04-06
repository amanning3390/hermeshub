#!/usr/bin/env python3
"""
HermesHub Skill Security Scanner
Scans SKILL.md files for common security threats before listing.

Checks:
  1. Data exfiltration patterns (curl/wget to unknown hosts, encoded URLs)
  2. Prompt injection attempts (system prompt overrides, jailbreak patterns)
  3. Destructive commands without confirmation gates
  4. Obfuscated or encoded payloads (base64, hex, eval)
  5. Unauthorized network access patterns
  6. Hardcoded secrets or API keys
  7. Environment variable abuse
  8. Supply-chain signals (typosquatting, suspicious dependencies)

Usage:
  python scripts/scan-skill.py skills/my-skill/SKILL.md
  python scripts/scan-skill.py skills/          # scan all skills

Exit codes:
  0 = passed (verified)
  1 = warnings found
  2 = critical findings (blocked)
  3 = usage error
"""

import sys
import os
import re
import json
import glob
import argparse
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Severity(Enum):
    INFO = "info"
    ADVISORY = "advisory"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class Finding:
    rule_id: str
    severity: Severity
    message: str
    line_number: Optional[int] = None
    line_content: Optional[str] = None


@dataclass
class ScanResult:
    file_path: str
    findings: list[Finding] = field(default_factory=list)
    passed: bool = True
    status: str = "verified"
    has_external_apis: bool = False


# ─── Reviewed External Domains ────────────────────────────────────────────────
# Domains that have been manually reviewed and verified as legitimate services.
# Skills calling these APIs are downgraded from BLOCKED → ADVISORY (pass with notice).
# To add a domain: verify the service is legitimate (website, privacy policy,
# terms of service, public reputation), then add an entry below.

REVIEWED_DOMAINS: dict[str, dict] = {
    "relayfortelegram.com": {
        "name": "Relay for Telegram",
        "reviewed": "2026-04-06",
        "category": "Telegram message search & AI analysis",
        "privacy_url": "https://relayfortelegram.com/privacy",
        "note": "Authenticated API (API key required). AES-256 encrypted storage. California jurisdiction.",
    },
}


def extract_domains_from_line(line: str) -> list[str]:
    """Extract domain names from URLs found in a line of text."""
    urls = re.findall(r'https?://([a-zA-Z0-9._-]+)', line)
    return [u.lower().lstrip('www.') for u in urls]


def is_reviewed_domain(line: str) -> Optional[str]:
    """Check if a line references a reviewed domain. Returns domain name or None."""
    domains = extract_domains_from_line(line)
    for domain in domains:
        for reviewed in REVIEWED_DOMAINS:
            if domain == reviewed or domain.endswith('.' + reviewed):
                return reviewed
    return None


# ─── Threat Rules ────────────────────────────────────────────────────────────

EXFIL_PATTERNS = [
    # curl/wget posting data to external hosts
    (r'curl\s+.*-[dX]\s+.*POST', "curl POST request detected — may exfiltrate data"),
    (r'curl\s+.*--data', "curl --data detected — may exfiltrate data"),
    (r'wget\s+.*--post-data', "wget POST detected — may exfiltrate data"),
    # netcat / ncat reverse shells
    (r'\bnc\s+-[elp]', "netcat listener detected — possible reverse shell"),
    (r'\bncat\b.*-[elp]', "ncat listener detected — possible reverse shell"),
    # python/node HTTP exfil
    (r'requests\.post\s*\(', "Python requests.post — verify destination is expected"),
    (r'fetch\s*\(\s*["\']https?://', "fetch() to external URL — verify destination"),
    (r'http\.request\s*\(', "Node http.request — verify destination is expected"),
    # DNS exfil
    (r'nslookup\s+.*\$', "Dynamic DNS lookup — possible DNS exfiltration"),
    (r'dig\s+.*\$', "Dynamic dig query — possible DNS exfiltration"),
]

PROMPT_INJECTION_PATTERNS = [
    (r'ignore\s+(all\s+)?previous\s+instructions', "Prompt injection: 'ignore previous instructions'"),
    (r'you\s+are\s+now\s+(a|an)\s+unrestricted', "Prompt injection: unrestricted mode attempt"),
    (r'disregard\s+(your|all)\s+(rules|instructions|guidelines)', "Prompt injection: disregard rules"),
    (r'system\s*:\s*you\s+are', "Prompt injection: system prompt override"),
    (r'<\|im_start\|>system', "Prompt injection: ChatML system tag"),
    (r'ADMIN_OVERRIDE', "Prompt injection: admin override token"),
    (r'jailbreak', "Prompt injection: jailbreak keyword"),
    (r'DAN\s+mode', "Prompt injection: DAN mode attempt"),
    (r'developer\s+mode\s+(enabled|output)', "Prompt injection: developer mode"),
]

DESTRUCTIVE_PATTERNS = [
    (r'rm\s+-rf\s+/', "Destructive: rm -rf on root path"),
    (r'rm\s+-rf\s+~', "Destructive: rm -rf on home directory"),
    (r'rm\s+-rf\s+\*', "Destructive: rm -rf wildcard"),
    (r'mkfs\.', "Destructive: filesystem format command"),
    (r'dd\s+if=.*of=/dev/', "Destructive: dd writing to device"),
    (r'DROP\s+(TABLE|DATABASE)', "Destructive: SQL DROP statement"),
    (r'TRUNCATE\s+TABLE', "Destructive: SQL TRUNCATE statement"),
    (r'DELETE\s+FROM\s+\w+\s*;?\s*$', "Destructive: unrestricted SQL DELETE"),
    (r':(){ :\|:& };:', "Destructive: fork bomb"),
    (r'>\s*/dev/sda', "Destructive: writing to disk device"),
    (r'chmod\s+-R\s+777\s+/', "Destructive: chmod 777 on root"),
]

OBFUSCATION_PATTERNS = [
    (r'base64\s+(--)?decode', "Obfuscation: base64 decode in command"),
    (r'echo\s+.*\|\s*base64\s+-d', "Obfuscation: piped base64 decode"),
    (r'atob\s*\(', "Obfuscation: JavaScript atob() decode"),
    (r'eval\s*\(', "Obfuscation: eval() — dynamic code execution"),
    (r'exec\s*\(', "Obfuscation: exec() — dynamic code execution"),
    (r'\\x[0-9a-fA-F]{2}.*\\x[0-9a-fA-F]{2}.*\\x[0-9a-fA-F]{2}', "Obfuscation: hex-encoded strings"),
    (r'\\u[0-9a-fA-F]{4}.*\\u[0-9a-fA-F]{4}.*\\u[0-9a-fA-F]{4}', "Obfuscation: unicode-escaped strings"),
    (r'fromCharCode', "Obfuscation: String.fromCharCode — possible payload hiding"),
    (r'compile\s*\(.*exec', "Obfuscation: compile + exec pattern"),
]

SECRET_PATTERNS = [
    (r'(?:api[_-]?key|apikey)\s*[:=]\s*["\'][A-Za-z0-9_\-]{20,}', "Hardcoded API key detected"),
    (r'(?:secret|password|passwd|pwd)\s*[:=]\s*["\'][^\s]{8,}', "Hardcoded secret/password detected"),
    (r'(?:token)\s*[:=]\s*["\'][A-Za-z0-9_\-\.]{20,}', "Hardcoded token detected"),
    (r'AKIA[0-9A-Z]{16}', "AWS Access Key ID detected"),
    (r'ghp_[A-Za-z0-9]{36}', "GitHub Personal Access Token detected"),
    (r'sk-[A-Za-z0-9]{20,}', "OpenAI/Stripe secret key pattern detected"),
    (r'xox[bpras]-[A-Za-z0-9\-]+', "Slack token detected"),
    (r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', "Private key detected"),
]

NETWORK_PATTERNS = [
    (r'0\.0\.0\.0', "Binding to 0.0.0.0 — exposed to all interfaces"),
    (r'INADDR_ANY', "Binding to INADDR_ANY — exposed to all interfaces"),
    (r'ngrok', "ngrok tunnel — exposes local services to internet"),
    (r'localtunnel', "localtunnel — exposes local services to internet"),
    (r'ssh\s+-R', "SSH reverse tunnel — possible network bypass"),
    (r'socat', "socat — network relay, verify intended use"),
]

ENV_ABUSE_PATTERNS = [
    (r'env\s*\|\s*curl', "Environment dump piped to curl — exfiltrating env vars"),
    (r'printenv\s*\|', "printenv piped — possible env var exfiltration"),
    (r'\$\{?HOME\}?\s*/\.ssh', "Accessing SSH directory — verify intended use"),
    (r'\$\{?HOME\}?\s*/\.aws', "Accessing AWS credentials directory"),
    (r'\$\{?HOME\}?\s*/\.config', "Accessing config directory — verify scope"),
    (r'os\.environ\s*\[', "Direct os.environ access — verify scoped to documented vars"),
    (r'process\.env\b', "process.env access — verify scoped to documented vars"),
]

SUPPLY_CHAIN_PATTERNS = [
    (r'pip\s+install\s+--index-url\s+(?!https://pypi\.org)', "Custom PyPI index — possible supply-chain attack"),
    (r'npm\s+install\s+--registry\s+(?!https://registry\.npmjs\.org)', "Custom npm registry — possible supply-chain attack"),
    (r'curl\s+.*\|\s*(?:bash|sh|python|node)', "Pipe to shell — remote code execution risk"),
    (r'wget\s+.*\|\s*(?:bash|sh|python|node)', "Pipe to shell — remote code execution risk"),
    (r'curl\s+.*-o\s+.*&&\s*(?:bash|sh|chmod)', "Download and execute pattern"),
]


def scan_content(content: str, file_path: str) -> ScanResult:
    """Scan a SKILL.md file content against all threat rules."""
    result = ScanResult(file_path=file_path)
    lines = content.split('\n')

    rule_groups = [
        ("EXFIL", EXFIL_PATTERNS, Severity.CRITICAL),
        ("PROMPT_INJECT", PROMPT_INJECTION_PATTERNS, Severity.CRITICAL),
        ("DESTRUCTIVE", DESTRUCTIVE_PATTERNS, Severity.CRITICAL),
        ("OBFUSCATION", OBFUSCATION_PATTERNS, Severity.WARNING),
        ("SECRET", SECRET_PATTERNS, Severity.CRITICAL),
        ("NETWORK", NETWORK_PATTERNS, Severity.WARNING),
        ("ENV_ABUSE", ENV_ABUSE_PATTERNS, Severity.WARNING),
        ("SUPPLY_CHAIN", SUPPLY_CHAIN_PATTERNS, Severity.CRITICAL),
    ]

    reviewed_domains_found: set[str] = set()

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped:
            continue

        for group_id, patterns, severity in rule_groups:
            for pattern, message in patterns:
                if re.search(pattern, stripped, re.IGNORECASE):
                    # Check if this is a known/reviewed external API
                    reviewed = is_reviewed_domain(stripped) if group_id == "EXFIL" else None
                    if reviewed:
                        reviewed_domains_found.add(reviewed)
                        info = REVIEWED_DOMAINS[reviewed]
                        result.findings.append(Finding(
                            rule_id="EXTERNAL_API",
                            severity=Severity.ADVISORY,
                            message=f"Calls reviewed external API: {info['name']} ({reviewed}) — {info['category']}",
                            line_number=line_num,
                            line_content=stripped[:120],
                        ))
                    else:
                        result.findings.append(Finding(
                            rule_id=group_id,
                            severity=severity,
                            message=message,
                            line_number=line_num,
                            line_content=stripped[:120],
                        ))

    if reviewed_domains_found:
        result.has_external_apis = True

    # Structural checks
    if '---' not in content[:500]:
        result.findings.append(Finding(
            rule_id="STRUCTURE",
            severity=Severity.INFO,
            message="No YAML frontmatter detected — skills should have frontmatter with name, version, author",
        ))

    # Determine overall status
    criticals = [f for f in result.findings if f.severity == Severity.CRITICAL]
    warnings = [f for f in result.findings if f.severity == Severity.WARNING]
    advisories = [f for f in result.findings if f.severity == Severity.ADVISORY]

    if criticals:
        result.passed = False
        result.status = "blocked"
    elif warnings:
        result.passed = True
        result.status = "warning"
    elif advisories:
        result.passed = True
        result.status = "advisory"
    else:
        result.passed = True
        result.status = "verified"

    return result


def format_result(result: ScanResult, verbose: bool = False) -> str:
    """Format scan result for terminal output."""
    lines = []
    icon = {"verified": "✅", "advisory": "⚡", "warning": "⚠️", "blocked": "❌"}
    status_color = {
        "verified": "\033[92m",  # green
        "advisory": "\033[96m",  # cyan
        "warning": "\033[93m",   # yellow
        "blocked": "\033[91m",   # red
    }
    reset = "\033[0m"

    lines.append(f"\n{'─' * 60}")
    lines.append(f"  {icon.get(result.status, '?')} {result.file_path}")
    lines.append(f"  Status: {status_color.get(result.status, '')}{result.status.upper()}{reset}")
    lines.append(f"  Findings: {len(result.findings)}")

    if result.findings:
        lines.append("")
        for f in result.findings:
            sev_icon = {"critical": "🔴", "advisory": "⚡", "warning": "🟡", "info": "🔵"}
            lines.append(f"  {sev_icon.get(f.severity.value, '?')} [{f.rule_id}] {f.message}")
            if f.line_number and verbose:
                lines.append(f"     Line {f.line_number}: {f.line_content}")

    lines.append(f"{'─' * 60}")
    return '\n'.join(lines)


def format_json(results: list[ScanResult]) -> str:
    """Format results as JSON for CI consumption."""
    output = []
    for r in results:
        # Collect reviewed domain metadata for advisory display
        reviewed_meta = []
        seen_domains = set()
        for f in r.findings:
            if f.rule_id == "EXTERNAL_API" and f.line_content:
                domain = is_reviewed_domain(f.line_content)
                if domain and domain not in seen_domains:
                    seen_domains.add(domain)
                    info = REVIEWED_DOMAINS[domain]
                    reviewed_meta.append({
                        "domain": domain,
                        "name": info["name"],
                        "category": info["category"],
                        "reviewed": info["reviewed"],
                        "privacy_url": info.get("privacy_url", ""),
                        "note": info.get("note", ""),
                    })

        output.append({
            "file": r.file_path,
            "status": r.status,
            "passed": r.passed,
            "has_external_apis": r.has_external_apis,
            "reviewed_domains": reviewed_meta,
            "findings": [
                {
                    "rule_id": f.rule_id,
                    "severity": f.severity.value,
                    "message": f.message,
                    "line_number": f.line_number,
                    "line_content": f.line_content,
                }
                for f in r.findings
            ],
        })
    return json.dumps(output, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="HermesHub Skill Security Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("path", help="Path to a SKILL.md file or a skills/ directory")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show line content for findings")
    parser.add_argument("--json", action="store_true", help="Output as JSON (for CI)")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = parser.parse_args()

    target = args.path
    files_to_scan: list[str] = []

    if os.path.isfile(target):
        files_to_scan.append(target)
    elif os.path.isdir(target):
        files_to_scan = sorted(glob.glob(os.path.join(target, "**", "SKILL.md"), recursive=True))
        if not files_to_scan:
            print(f"No SKILL.md files found in {target}")
            sys.exit(3)
    else:
        print(f"Path not found: {target}")
        sys.exit(3)

    results: list[ScanResult] = []
    for file_path in files_to_scan:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        results.append(scan_content(content, file_path))

    # Output
    if args.json:
        print(format_json(results))
    else:
        print(f"\n🔍 HermesHub Security Scanner")
        print(f"   Scanning {len(files_to_scan)} skill(s)...\n")
        for r in results:
            print(format_result(r, verbose=args.verbose))

        # Summary
        total = len(results)
        verified = sum(1 for r in results if r.status == "verified")
        advisory = sum(1 for r in results if r.status == "advisory")
        warnings = sum(1 for r in results if r.status == "warning")
        blocked = sum(1 for r in results if r.status == "blocked")

        print(f"\n📊 Summary: {verified} verified, {advisory} advisory, {warnings} warnings, {blocked} blocked out of {total} skill(s)\n")

    # Exit code
    has_critical = any(not r.passed for r in results)
    has_warning = any(r.status == "warning" for r in results)

    if has_critical:
        sys.exit(2)
    elif has_warning and args.strict:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
