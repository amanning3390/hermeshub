# PyPI & npm Package Publishing

## PyPI Publishing

### Build
```bash
# Can't build on /mnt/d/OneDrive — permission denied. Copy to /tmp first.
cp -r /path/to/project /tmp/build-dir
cd /tmp/build-dir
python3 -m build --wheel
```

### Non-Interactive Upload (WSL/CI)
Twine's env vars (`TWINE_USERNAME`/`TWINE_PASSWORD`) don't work in non-interactive terminals because twine falls back to `getpass`. Use subprocess with explicit env:

```bash
python3 -c "
import subprocess, os
env = os.environ.copy()
env['TWINE_USERNAME'] = '__token__'
env['TWINE_PASSWORD'] = 'pypi-...'
result = subprocess.run(['python3', '-m', 'twine', 'upload', 'dist/*'], env=env, capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
"
```

### Token Setup
1. Create account at https://pypi.org/account/register/
2. Generate token at https://pypi.org/manage/account/token/
3. Token starts with `pypi-`
4. Scope: "Entire account" for first publish, then project-specific

## npm Publishing

### Non-Interactive Upload
```bash
# Set token globally
npm config set //registry.npmjs.org/:_authToken npm_...

# Publish
cd /path/to/npm-package
npm publish
```

### Token Setup (Granular Access Tokens)
As of November 2025, only Granular access tokens exist (legacy tokens removed).

1. Create account at https://www.npmjs.com/signup/
2. Go to https://www.npmjs.com/settings/tokens
3. Generate New Token -> **Granular access token**
4. Set packages/scopes, permissions: **Read and write**
5. **Critical**: Enable **"Bypass 2FA"** checkbox -- required for non-interactive publish when account has 2FA
6. Token starts with `npm_`

### Pitfalls
- **403 "Two-factor authentication or granular access token with bypass 2fa enabled is required"**: Token was created without "Bypass 2FA" enabled. Regenerate with the checkbox checked.
- **npm auto-corrects package.json**: Warnings about `bin` script name cleaning or `repository.url` normalization are harmless.

## GitHub `gh` CLI Auth for Pushing

### Required Scopes
- `repo` -- push code
- `workflow` -- push `.github/workflows/` files (WITHOUT this, push is rejected)
- `gist`, `read:org` -- standard

### Auth Flow
```bash
gh auth login --scopes "repo,gist,workflow,read:org" --web
# User enters one-time code at https://github.com/login/device
```

### After Auth
```bash
gh auth setup-git  # configures git credential helper
git push origin main
```

### Pitfalls
- **"refusing to allow an OAuth App to create or update workflow without workflow scope"**: Re-run `gh auth login` with `--scopes` including `workflow`
- **Auth codes expire quickly**: Have the user ready at the browser before starting
- **`gh auth setup-git` needed**: Without it, `git push` fails with "could not read Username"
