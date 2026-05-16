# Render API Deployment Reference

Full transcript of deploying `my-app-backend` (FastAPI) to Render via API, including pitfalls and fixes.

## Prerequisites
- GitHub PAT (classic, `repo` scope): `ghp_...` (retrieved via `session_search(query="github token")`)
- Render API key: `rnd_...` (retrieved via `session_search(query="render api key")`)
- Render account connected to GitHub: https://dashboard.render.com/accounts/github

## Step 1: Create Private GitHub Repo
```bash
curl -X POST https://api.github.com/user/repos \
  -H "Authorization: token ghp_YOUR_GITHUB_PAT" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"name":"my-app","private":true,"description":"My App - description"}'
```

## Step 2: Push Code to GitHub
```bash
cd /mnt/d/iit/my-app
git init
git branch -M main
git remote add origin https://ghp_YOUR_GITHUB_PAT@github.com/YOUR_GITHUB_USERNAME/my-app.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

## Step 3: Correct render.yaml Placement
**Pitfall:** Render expects `render.yaml` in repo root, not subdirectory.

Incorrect (initial):
```
backend/render.yaml
```

Correct:
```
render.yaml (repo root)
```
With `rootDir` set for app subdirectory:
```yaml
services:
  - type: web
    name: my-app-backend
    env: python
    plan: free
    rootDir: backend  # App lives in backend/ subdir
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: PYTHON_VERSION
        value: 3.11.0
```

## Step 4: Update App to Use Render PORT
Modify `backend/config.py`:
```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OpenRouter API configuration
    your_api_key: str
    openai_base_url: str = "https://openrouter.ai/api/v1"
    openai_model: str = "stepfun/step-3.5-flash"

    # Server configuration (use Render's $PORT)
    app_host: str = "0.0.0.0"
    app_port: int = int(os.environ.get("PORT", 8000))  # Default 8000 for local dev

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

**Pitfall:** Check for duplicate imports after patching (e.g., duplicate `from pydantic_settings import BaseSettings`).

## Step 5: Verify Render API Key
```bash
curl -s -H "Authorization: Bearer rnd_YOUR_RENDER_API_KEY" https://api.render.com/v1/owners
```
Expected output: JSON array with your Render account details.

## Step 6: Create Render Service via API
```bash
curl -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer rnd_YOUR_RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_service",
    "name": "my-app-backend",
    "repo": "https://github.com/YOUR_GITHUB_USERNAME/my-app.git",
    "branch": "main",
    "rootDir": "backend",
    "env": "python",
    "plan": "free",
    "buildCommand": "pip install -r requirements.txt",
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "envVars": [{"key": "PYTHON_VERSION", "value": "3.11.0"}]
  }'
```

**Pitfall:** This fails if Render account is not connected to GitHub (one-time setup required at https://dashboard.render.com/accounts/github).

## Alternative: Dashboard Deployment (Simpler)
1. Go to https://render.com → New + → Blueprint
2. Connect GitHub account (first time only)
3. Select `my-app` repo
4. Apply blueprint
5. Add `OPENAI_API_KEY` env var in dashboard settings
