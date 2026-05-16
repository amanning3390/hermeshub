---
name: render-deployment-wsl
description: Render deployment workflow for WSL2 users, covering FastAPI backends, Windows interop, line ending fixes, git authentication workarounds, and user-preferred terminal-only output.
trigger:
  - User requests Render deployment for a project
  - User mentions Render Deploy Hook URL
  - User needs to deploy Python/FastAPI projects to Render from WSL2
---

# Render Deployment (WSL2)

## Core Workflow
1. **Webhook Verification**: Check if `RenderDeployHookURL` is provided. If missing, respond exactly:
   `"Acknowledged. Please provide the Render Deploy Hook URL for [ProjectName] to proceed."`
   Initial trigger response: `"Render deployment for [App Name] initiated. Waiting for Deploy Hook URL..."`
2. **Project Audit**:
   - Verify `render.yaml` exists in project root with `rootDir` set to target subdirectory (e.g., `rootDir: backend`)
   - **Critical**: `startCommand` must use `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` (not bare `uvicorn`)
   - Fix CRLF line endings in shell scripts (`build.sh`, `start.sh`) and text files:
     ```bash
     python -c "content = open('FILE_PATH', 'rb').read(); open('FILE_PATH', 'wb').write(content.replace(b'\r\n', b'\n'))"
     ```
   - Ensure `requirements.txt` uses `uvicorn[standard]` not bare `uvicorn`
3. **Git Operations**:
   - WSL git push fails due to missing Windows credential manager access. Use Windows git executable:
     ```bash
     /mnt/c/Program\ Files/Git/cmd/git.exe push origin main
     ```
   - **WSL Terminal Detection Bug**: `git commit` may fail with "long-lived server" error. Workaround: create shell script `do_commit.sh` and run via `bash`, or use Windows git executable for commit:
     ```bash
     /mnt/c/Program\ Files/Git/cmd/git.exe commit -m "message"
     ```
   - Set git identity if unset:
     ```bash
     git config user.email "user@example.com" && git config user.name "User Name"
     ```
4. **Deploy Execution**:
   - Trigger Render webhook directly:
     ```bash
     curl -X POST "[RenderDeployHookURL]"
     ```
   - **Batch Script Quoting Workaround**: WSL escapes quotes incorrectly for Windows batch `cmd.exe /c "script.bat \"arg\""`. If quoting fails, create hardcoded wrapper script with paths/URLs embedded (e.g., `project_render_deploy.bat`).

## Pitfalls
- **OneDrive Build Permissions**: Python `build` (setuptools) fails with `Permission denied` on `/mnt/c/Users/YOU/OneDrive` paths. Always `cp -r` to `/tmp` before building wheels or running setuptools.
- **Batch Script Quoting**: WSL escapes quotes incorrectly for Windows batch. Use Windows-native git or hardcode paths in temporary deploy scripts.
- **CRLF Line Endings**: Break Linux build steps. Always run LF conversion on shell scripts before committing.
- **Missing rootDir**: Render defaults to project root. Set `rootDir: <subdirectory>` in `render.yaml` for subdirectory deployments.
- **Git Auth in WSL**: WSL cannot access Windows credential manager. Use `/mnt/c/Program Files/Git/cmd/git.exe` for all push/pull operations.
- **OpenAI Version Incompatibility**: `openai < 1.68.0` causes `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'` on Render due to `httpx` dependency mismatch. Always use `openai>=1.68.0` in `requirements.txt`.
- **Render Cron Job Limitation**: Render API does not support programmatic cron job creation (endpoint returns 404). Cron jobs must be created via the Render Dashboard UI, or use external uptime monitors like UptimeRobot (free) for keep-alive pings.

## Keep-Alive for Free Tier
Render free tier services spin down after 15 minutes of inactivity. To prevent this:
1. **Render Dashboard**: Create a cron job via UI (Cron Jobs tab) with schedule `*/10 * * * *` pinging root endpoint.
2. **UptimeRobot Alternative** (free, no dashboard needed):
   - Sign up at https://uptimerobot.com
   - **Get API Key**: Go to My Settings → API Settings → Create the main API key (format: `u<numbers>-<hex>`)
   - Create HTTP(s) monitor with URL `https://<service>.onrender.com/` and 5-10 minute interval
   - **API Key Format**: `u<numbers>-<hex>` (e.g., `u0000000-000000000000000000000000`)
   - **Monitor Types**: `type: 1` for HTTP(s) monitor
   - **API Creation**:
     ```bash
     curl -X POST https://api.uptimerobot.com/v2/newMonitor \
       -H "Content-Type: application/json" \
       -d '{"api_key": "<API_KEY>", "friendly_name": "service-name", "url": "https://<service>.onrender.com/", "type": 1, "interval": 300}'
     ```
   - **Response Format** (success):
     ```json
     {"stat": "ok", "monitor": {"status": 1, "id": 802981870}}
     ```
   - **Verify Monitor**: Dashboard at https://dashboard.uptimerobot.com

## Vercel Frontend Deployment

For Vite/React frontends in a `frontend/` subdirectory, see:
`references/vercel-frontend-deployment.md`

Key pitfalls:
- **Env vars are build-time, not runtime** — `VITE_API_URL` must be set in Vercel Dashboard AND you must redeploy after changing it
- **Trailing slash** — Always `.replace(/\\/$/, '')` on env var URLs before concatenating with `/endpoint`
- **Vercel Authentication** — New projects may have SSO protection enabled by default; disable in Dashboard → Deployment Protection
- **WSL node_modules** — Native modules (rollup) break in WSL; copy project to `~/dir` on WSL or use Windows PowerShell for `npm install`
- **Vercel CLI "Unexpected error"** — Update CLI: `npm install -g vercel@latest`
- **Old cached build** — Verify new deployment by checking JS bundle hash: `curl -s <url> | grep -o 'index-[A-Za-z0-9]*\\.js'`
- **Vercel project ≠ domain** — Deleting a Vercel project removes its auto-generated domain. Verify the correct project owns the domain before deploying.
- **Vercel CLI project mismatch** — `vercel --prod` auto-links to a project. If the old project was deleted, the CLI creates a new one. Check the deployment URL.

## Streaming SSE Backend + Vite/React Frontend

When the frontend expects streaming Server-Sent Events (SSE) from the backend:

**Backend MUST use `StreamingResponse`**, NOT plain JSON:
```python
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

@app.post("/chat")
async def chat(request: ChatRequest):
    async def event_generator():
        stream = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield f"data: {json.dumps({'token': delta.content})}\\n\\n"
        yield "data: [DONE]\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Critical**: If the frontend shows no response (but no error), the backend is likely returning plain JSON instead of SSE. Check with:
```bash
curl -s -X POST https://backend.onrender.com/chat -H "Content-Type: application/json" -d '{"message":"test"}'
```
Expected: `data: {"token": "..."}` lines ending with `data: [DONE]`
NOT: `{"response": "..."}` (plain JSON — frontend will hang)

## User Preferences
- **Output Style**: Terminal-style only, no prose, no explanations, no supplementary tips.
- **Response Format**: Use exact strings as specified, no additional commentary.

## Support Files
- `templates/render.yaml`: Sample render.yaml with correct syntax
- `scripts/universal_render_deploy.bat`: Fixed deploy script with proper quoting
- `references/common-errors.md`: Frequent Render deployment errors and fixes
