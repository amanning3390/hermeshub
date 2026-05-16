# Common Render Deployment Errors (WSL2)

## 1. CRLF Line Endings
**Symptom**: Build fails with `syntax error near unexpected token` in shell scripts.
**Fix**: Convert all shell scripts to LF:
```bash
python -c "content = open('script.sh', 'rb').read(); open('script.sh', 'wb').write(content.replace(b'\r\n', b'\n'))"
```

## 2. Git Authentication Failures in WSL
**Symptom**: `fatal: could not read Username for 'https://github.com'` when pushing from WSL.
**Fix**: Use Windows git executable:
```bash
/mnt/c/Program\ Files/Git/cmd/git.exe push origin main
```

## 3. Missing rootDir in render.yaml
**Symptom**: Render cannot find `main.py` or `requirements.txt`.
**Fix**: Add `rootDir: <subdirectory>` to `render.yaml` (e.g., `rootDir: backend`).

## 4. Batch Script Quoting Issues
**Symptom**: Windows batch script receives malformed paths with escaped quotes when called from WSL.
**Fix**: Pass arguments with proper quoting in WSL:
```bash
cmd.exe /c "$DEPLOY_SCRIPTS/universal_render_deploy.bat \"PATH\" \"URL\""
```

## 5. uvicorn Missing Dependencies
**Symptom**: `ModuleNotFoundError: No module named 'uvicorn.workers'`.
**Fix**: Use `uvicorn[standard]` in `requirements.txt` instead of bare `uvicorn`.
