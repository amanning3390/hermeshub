---
name: security-auditor
description: Scan code for vulnerabilities, secret leaks, dependency issues, and configuration problems. Use when the user wants a security audit, vulnerability scan, or code security review.
version: "1.0.0"
license: MIT
compatibility: Works on all platforms. Enhanced with trivy, semgrep, or bandit.
metadata:
  author: hermeshub
  hermes:
    tags: [security, audit, owasp, secrets, vulnerabilities]
    category: security
    requires_tools: [terminal]
---

# Security Auditor

Comprehensive security scanning and audit reporting.

## When to Use
- User asks for a security audit or vulnerability scan
- User wants to check code for secret leaks
- User needs dependency vulnerability checking
- Before deploying to production
- When reviewing third-party code or skills

## Procedure

### 1. Secret Scanning
Search for accidentally committed secrets:
```bash
# Common patterns to search
grep -rn "API_KEY\|SECRET\|PASSWORD\|TOKEN\|PRIVATE_KEY" --include="*.{py,js,ts,env,yml,yaml,json}" .
grep -rn "sk-[a-zA-Z0-9]\{20,\}" . # OpenAI keys
grep -rn "ghp_[a-zA-Z0-9]\{36\}" . # GitHub PATs
grep -rn "AKIA[0-9A-Z]\{16\}" . # AWS Access Keys
```

### 2. Dependency Audit
```bash
# Node.js
npm audit --json
# Python
pip-audit
# Docker
docker scout cves image:tag
```

### 3. Code Analysis (OWASP Top 10)
Check for:
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection (SQL, Command, XSS)
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Auth Failures
- A08: Software/Data Integrity Failures
- A09: Logging/Monitoring Failures
- A10: SSRF

### 4. Hermes Skill Security Scan
For reviewing skills before installation:
- Check for data exfiltration patterns (curl to external URLs)
- Look for prompt injection attempts
- Verify no destructive commands without confirmation
- Check environment variable access patterns
- Scan for obfuscated code or encoded payloads

## Report Format
```markdown
# Security Audit Report
**Target:** [project/skill name]
**Date:** [date]
**Risk Level:** Critical/High/Medium/Low

## Findings
| # | Severity | Category | Description | Location |
|---|----------|----------|-------------|----------|
| 1 | Critical | Secrets  | Exposed API key | config.py:42 |

## Recommendations
1. [Prioritized remediation steps]

## Summary
- Critical: X | High: X | Medium: X | Low: X
```

## Pitfalls
- False positives are common — verify each finding
- Don't expose actual secret values in reports
- Some test fixtures intentionally contain fake credentials
- Audit transitive dependencies, not just direct ones

## Verification
- All critical/high findings have remediation steps
- No actual secrets appear in the audit report itself
- Report includes scan methodology and tool versions
