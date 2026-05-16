# Vercel Frontend Deployment (Vite/React)

## Pattern: Monorepo with frontend/ subdirectory

When the frontend lives in a subdirectory (e.g., `frontend/`) of a monorepo:

### 1. Root vercel.json
Create `vercel.json` in the **repo root** (not inside `frontend/`):
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "devCommand": "cd frontend && npm run dev"
}
```

### 2. Environment Variables
Vite env vars must be set in **Vercel Dashboard** (Settings → Environment Variables), NOT in `.env` files (`.env` is gitignored).

- Name: `VITE_API_URL`
- Value: `https://your-backend.onrender.com` (NO trailing slash)
- Environment: Production

**Critical:** Env vars are baked into the build at deploy time. Changing the var alone is NOT enough — you must **Redeploy** after adding/changing env vars.

### 3. API URL in Code
In your React component (e.g., `Chat.tsx`):
```typescript
const apiUrl = (import.meta.env.VITE_API_URL || 'https://your-backend.onrender.com').replace(/\/$/, '')
const response = await fetch(`${apiUrl}/chat`, { ... })
```

**Gotchas:**
- `import.meta.env.VITE_API_URL` is replaced at build time by Vite. It does NOT work in browser console.
- Always add `.replace(/\/$/, '')` to handle trailing slashes in env vars.
- Always provide a hardcoded fallback URL for cases where the env var isn't set.

### 4. WSL node_modules Fix
WSL `node_modules` often has broken native modules (e.g., `@rollup/rollup-linux-x64-gnu`). Two approaches:

**Option A — Copy to WSL home:**
```bash
cp -r /mnt/d/path/to/frontend ~/my-app-frontend
cd ~/my-app-frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Option B — Use Windows PowerShell (preferred):**
```powershell
cd D:\path\to\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run build
```

**Why this happens:** Vite/rollup requires platform-native `.node` binaries. WSL's Linux binaries are incompatible with Windows-hosted npm, and vice versa. Always run `npm install` on the same platform that will run `npm run build`.

### 5. Vercel CLI Deployment
```powershell
cd D:\path\to\frontend
vercel --prod --yes
```

**Pitfalls:**
- Vercel CLI may fail with "Unexpected error" if outdated. Update: `npm install -g vercel@latest`
- Vercel CLI auto-detects Vite settings. If it fails, use `vercel.json` in repo root.
- The CLI may deploy to a different project than expected. Verify the deployment URL matches your domain.

### 6. Deployment Protection
New Vercel projects may have **Vercel Authentication** (SSO) enabled by default. This blocks public access.
- Disable in: Vercel Dashboard → Project Settings → Deployment Protection → **Disabled**

### 7. Verifying the Deployment
```bash
# Check which JS bundle is served (new hash = new build)
curl -s https://your-app.vercel.app/ | grep -o 'index-[A-Za-z0-9]*\.js'
```

If the hash doesn't match your local `dist/` build, the browser is caching the old version. Hard refresh: **Ctrl+Shift+R**.

### 8. Connecting Custom Domain
1. Vercel Dashboard → Project → Settings → Domains
2. Add domain (e.g., `my-app.vercel.app`)
3. Follow DNS instructions

## Streaming SSE: Backend + Frontend

When the frontend expects streaming Server-Sent Events (SSE) from the backend:

### Backend MUST use `StreamingResponse`, NOT plain JSON

**Correct (FastAPI + httpx):**
```python
from fastapi.responses import StreamingResponse
import httpx, json

@app.post("/chat")
async def chat(request: ChatRequest):
    async def event_generator():
        async with httpx.AsyncClient(base_url="https://openrouter.ai/api/v1", headers={"Authorization": f"Bearer {api_key}"}) as client:
            async with client.stream("POST", "/chat/completions", json={"model": "...", "messages": [...], "stream": True}) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0].get("delta", {})
                        if delta.get("content"):
                            yield f"data: {json.dumps({'token': delta.content})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### CRITICAL: AsyncOpenAI Streaming Does NOT Work on Render

The `AsyncOpenAI` client with `stream=True` **buffers the entire response** on Render, causing the frontend to hang with no response. Use raw `httpx` streaming instead.

### Verifying SSE Stream
```bash
curl -s -X POST https://backend.onrender.com/chat -H "Content-Type: application/json" -d '{"message":"test"}'
```

**Expected:** `data: {"token": "..."}` lines ending with `data: [DONE]`
**Wrong:** `{"response": "..."}` (plain JSON — frontend will hang)
