---
name: dependency-security-scanner
description: Scan project dependencies for known security vulnerabilities. Supports npm, pip, cargo, go modules, and more. Integrates with OSV database and GitHub Advisory Database. Trigger when user wants to check dependencies for vulnerabilities, audit project security, or set up automated dependency scanning.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [security, dependencies, vulnerabilities, scanning, npm, pip, audit, CVE]
    category: security
---

# Dependency Security Scanner

## When to Use
- User wants to check project dependencies for known vulnerabilities
- User asks about security audit of their project
- User wants to set up automated dependency scanning
- User asks if a specific package has known CVEs
- User wants to understand the risk of a dependency

## Procedure

1. **Identify the project's package manager**: Detect which ecosystem the project uses:
   - `package.json` → npm/yarn/pnpm
   - `requirements.txt` / `pyproject.toml` / `Pipfile` → pip
   - `Cargo.toml` → Rust (cargo)
   - `go.mod` → Go modules
   - `Gemfile` → Ruby (bundler)
   - `pom.xml` / `build.gradle` → Java (Maven/Gradle)

2. **Run the appropriate scanner**:
   - **npm**: `npm audit --json`
   - **pip**: `pip-audit --format=json` or `safety check --json`
   - **cargo**: `cargo audit`
   - **go**: `govulncheck ./...`
   - **Ruby**: `bundle audit check --update`

3. **Parse and categorize findings**:
   - **Critical**: Remote code execution, SQL injection, authentication bypass
   - **High**: Privilege escalation, data exposure, SSRF
   - **Medium**: DoS, information disclosure, XSS
   - **Low**: Minor issues, defense-in-depth improvements

4. **For each vulnerability**, report:
   - CVE ID and severity
   - Affected package and version range
   - Fixed version (if available)
   - Brief description of the vulnerability
   - Whether the project uses the affected code path (if determinable)

5. **Recommend actions**:
   - Update to fixed version (if available)
   - If no fix: consider alternative packages or implement workarounds
   - Add to `.npmrc`, `pip.conf`, or equivalent to block vulnerable versions
   - Set up automated scanning in CI/CD pipeline

6. **Present results**: Show summary (total vulnerabilities by severity), detailed findings table, and prioritized action items.

## Examples

### Example 1: Full project scan
```
Input: "Scan my Node.js project for dependency vulnerabilities"
Expected behavior: Run npm audit, parse results, show categorized findings with fix recommendations
```

### Example 2: Specific package check
```
Input: "Is lodash 4.17.19 safe to use?"
Expected behavior: Check lodash 4.17.19 against known CVEs, report any findings
```

## Pitfalls
- **False positives**: Not all vulnerabilities are exploitable in every context. Assess whether the affected code path is actually used.
- **Transitive dependencies**: Vulnerabilities in indirect dependencies (dependencies of dependencies) are often missed by manual review.
- **Fix availability**: Some vulnerabilities have no fix yet. Document these and monitor for updates.
- **Breaking changes**: Updating to a fixed version may introduce breaking changes. Test thoroughly.

## Verification
- Cross-check at least one CVE against the NVD (nvd.nist.gov)
- Verify that the reported affected version range is correct
- Confirm that the recommended fix version actually resolves the issue
