---
name: skill-auditor
description: Audit Hermes Agent skills for quality, security, and best practices. Checks SKILL.md format, frontmatter completeness, security risks, and adherence to agentskills.io spec. Trigger when user wants to audit a skill, validate a skill before submission, or check skill quality.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [skill, audit, quality, security, hermeshub, agentskills, validation]
    category: security
---

# Skill Auditor

## When to Use
- User wants to audit a Hermes skill for quality
- User asks to validate a skill before submitting to HermesHub
- User wants to check if a skill follows best practices
- User asks about skill security review criteria
- User wants to improve an existing skill

## Procedure

1. **Validate SKILL.md frontmatter**:
   - [ ] `name` field present, lowercase with hyphens (1-64 chars)
   - [ ] `description` field present, clear and keyword-rich (1-1024 chars max)
   - [ ] `version` field present, semantic versioning format
   - [ ] `license` field present
   - [ ] `metadata.author` present
   - [ ] `metadata.hermes.tags` present with relevant tags
   - [ ] `metadata.hermes.category` present and valid

2. **Validate SKILL.md structure**:
   - [ ] Title heading present
   - [ ] "When to Use" section with clear trigger conditions
   - [ ] "Procedure" section with numbered steps
   - [ ] "Examples" section with at least one example
   - [ ] "Pitfalls" section with known failure modes
   - [ ] "Verification" section with success criteria

3. **Security review** (HermesHub automatic rejection triggers):
   - [ ] No curl/wget to external URLs with system data (data exfiltration)
   - [ ] No base64-encoded or obfuscated shell commands
   - [ ] No instructions to bypass security prompts or approval gates
   - [ ] No downloading and executing binaries from external URLs
   - [ ] No hidden instructions in referenced files that contradict SKILL.md
   - [ ] No prompt injection or jailbreak attempts
   - [ ] No hardcoded credentials, tokens, or API keys
   - [ ] All environment variables documented with setup instructions

4. **Quality review**:
   - [ ] Main SKILL.md under 500 lines (detailed material in references/)
   - [ ] Clear, actionable procedure steps
   - [ ] Examples include both input and expected behavior
   - [ ] Pitfalls cover real edge cases, not generic advice
   - [ ] Verification steps are specific and testable
   - [ ] Language is clear and concise (no unnecessary jargon)

5. **Directory structure check**:
   - [ ] `SKILL.md` present in skill root directory
   - [ ] `scripts/` directory (if present) contains only necessary scripts
   - [ ] `references/` directory (if present) contains supporting documentation
   - [ ] `assets/` or `templates/` directory (if present) contains reusable resources
   - [ ] No unnecessary files (`.DS_Store`, `Thumbs.db`, etc.)

6. **Present results**: Show a scorecard with pass/fail for each category, specific findings, and recommendations for improvement.

## Examples

### Example 1: Full skill audit
```
Input: "Audit my crypto-arb-scanner skill before I submit it"
Expected behavior: Run all checks, show scorecard with findings and recommendations
```

### Example 2: Quick validation
```
Input: "Does my skill have all the required frontmatter fields?"
Expected behavior: Check frontmatter, report any missing or invalid fields
```

## Pitfalls
- **Overly strict**: Some quality issues are subjective. Distinguish between "must fix" (security, format) and "nice to have" (style, completeness).
- **Context matters**: A skill for personal use may not need the same rigor as one being published.
- **Evolving standards**: The agentskills.io spec may update. Check for the latest version.

## Verification
- Re-read the skill after auditing to ensure findings are accurate
- Verify that security findings are actual risks, not false positives
- Check that recommendations are actionable
