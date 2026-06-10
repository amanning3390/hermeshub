# HermesHub Submission Process

## How to submit a skill to HermesHub

1. **Fork** https://github.com/amanning3390/hermeshub
2. **Create** your skill under `skills/<skill-name>/SKILL.md`
3. **Ensure** the SKILL.md follows the hermeshub format:
   - Use `compatibility` (not `platforms`)
   - Use `metadata.author` (not top-level `author`)
   - Include `allowed-tools` field
   - Declare `required_environment_variables` if any
   - No hardcoded credentials
4. **Open a PR** against the upstream hermeshub repo
5. **Automated security scan** runs (65+ threat rules, critical findings block merge)
6. **After passing** scan + review → skill goes live on hermeshub.xyz

## Security rejection triggers
- Curl/wget to external URLs with system data (exfiltration)
- Base64-encoded or obfuscated shell commands
- Instructions to bypass security prompts
- Downloading and executing binaries from external URLs
- Hidden instructions in referenced files
- Prompt injection or jailbreak attempts

## Required for approval
- All environment variables documented with setup instructions
- No hardcoded credentials, tokens, or API keys
- Destructive operations require explicit user confirmation
- Network access patterns documented and justified
- File system access scoped to relevant directories
- Publisher identity verified via GitHub account

## Trust levels
| Level | Source | Policy |
|-------|--------|--------|
| Verified | HermesHub reviewed and approved | Full security scan passed |
| Community | Community-submitted via PR | Automated scan + basic review |
| Unverified | Direct GitHub link | Use `--force` to install |

## Key lessons (2026-06-10)
- PR #119 submitted with open-source-contribution + platform-picker skills
- The hermeshub fork is at github.com/SaintChris/hermeshub
- The skill template and writing guide are in github.com/SaintChris/hermes-skills
- Platform picker CLI at ~/.hermes/scripts/platform_picker.py handles Dev.to publish, GitHub gist creation
- Dev.to API: max 4 tags per article (422 error if exceeded), 10 articles/hour rate limit
- LinkedIn OAuth tokens expire — re-run `setup linkedin` with fresh token
- GitHub PAT needs `gist` scope for gist creation, `repo` for repo operations
