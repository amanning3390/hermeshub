---
name: clawhub-skill-adapter
description: Migrate skills from OpenClaw's ClawHub to Hermes with one click. Supports cross-platform (Linux/macOS/Windows/WSL) with automatic environment detection and adaptation. Perfect for users switching from OpenClaw or wanting to use ClawHub's 31,000+ skills in Hermes.
version: "1.0.0"
license: MIT
metadata:
  author: Cuchulainn521
  hermes:
    tags: [clawhub, openclaw, migration, skill-adapter, cross-platform, import]
    category: development
---

# ClawHub Skill Adapter

Migrate skills from OpenClaw's ClawHub ecosystem to Hermes Agent with automated adaptation.

## When to Use

- User wants to find a skill that exists on ClawHub but not in Hermes
- User is switching from OpenClaw to Hermes and wants to migrate their skills
- User needs specific functionality available only on ClawHub (31,000+ skills)
- User asks "Is there a skill for X?" and ClawHub has it
- User wants to batch migrate multiple skills from OpenClaw

## Procedure

### 1. Search for the Skill on ClawHub

Use web search to find the skill on GitHub:
```python
results = web_search("site:github.com/openclaw/skills keyword")
```

Or browse directly: https://clawhub.ai

### 2. Download the Skill

Use the cross-platform download function:
```python
# Download complete skill with all files
skill_dir = download_clawhub_skill("author/skill-name")
```

This handles all platforms (Linux/macOS/Windows/WSL) automatically.

### 3. Adapt to Hermes Format

The skill automatically adapts:
- `npx skills` → `hermes skills`
- `clawhub install` → `hermes skills install`
- OpenClaw-specific tools → Hermes equivalents

### 4. Install in Hermes

```python
skill_manage(
    action="create",
    name="skill-name",
    category="development",
    content=adapted_skill_content
)
```

## Examples

### Example 1: Single Skill Migration

**User**: "I want to use the academic research skill from ClawHub"

**Agent**:
```python
# 1. Identify skill
skill_path = "anisafifi/academic-research-hub"

# 2. Download and adapt
migrate_clawhub_skill(skill_path, category="research")

# 3. Confirm success
print("✅ Academic research skill migrated successfully!")
print("Use: skill_view('academic-research-hub')")
```

### Example 2: Batch Migration

**User**: "Migrate all my OpenClaw development skills"

**Agent**:
```python
skills_to_migrate = [
    ("anisafifi/academic-research-hub", "research"),
    ("kcns008/kubernetes", "devops"),
    ("cubetribe/cc-godmode", "software-development"),
]

for skill_path, category in skills_to_migrate:
    try:
        migrate_clawhub_skill(skill_path, category=category)
        print(f"✅ {skill_path}")
    except Exception as e:
        print(f"❌ {skill_path}: {e}")
```

### Example 3: Download Without Installing

**User**: "Download the skill so I can review it first"

**Agent**:
```python
# Download only
skill_dir = download_clawhub_skill("author/skill-name")
print(f"Skill downloaded to: {skill_dir}")
print("Review the files, then manually install if satisfied.")
```

## Cross-Platform Support

This skill automatically detects and adapts to:

| Platform | Download Method | Notes |
|----------|----------------|-------|
| Linux | wget/curl/Python | Standard tools |
| macOS | curl/Python | curl pre-installed |
| Windows | PowerShell/Python | Cross-platform compatibility |
| WSL | wget/curl | Linux tools available |

## Key Functions

### `download_clawhub_skill(skill_path, output_dir)`
Downloads a complete skill from ClawHub including all subdirectories.

### `migrate_clawhub_skill(skill_path, new_name, category)`
One-click migration: download + adapt + install.

### `detect_environment()`
Returns environment info: OS, available tools, WSL detection.

## Pitfalls

- **Not all skills adapt perfectly**: Some OpenClaw-specific features may need manual adjustment
- **External dependencies**: Skills requiring specific binaries (e.g., `gh` CLI) need separate installation
- **API rate limits**: Heavy use may hit GitHub API limits
- **Security review**: Always review downloaded skills before installation (ClawHub is community-driven)
- **License compliance**: Respect original skill licenses when adapting

## Verification

After migration:
1. Check skill is listed: `skills_list()`
2. View skill content: `skill_view("skill-name")`
3. Test functionality with a simple query
4. Verify no errors in adaptation (check frontmatter format)

## Related Resources

- ClawHub: https://clawhub.ai
- OpenClaw Skills: https://github.com/openclaw/skills
- Hermes Skills Docs: https://hermes-agent.nousresearch.com/docs/skills/

## Changelog

### v1.0.0
- Initial release
- Cross-platform support (Linux/macOS/Windows/WSL)
- Batch migration capability
- Automatic environment detection
