@echo off
REM ── Generic Render Deploy Script ──────────────────────────────
REM Usage: project_render_deploy.bat "PROJECT_DIR" "RENDER_HOOK_URL"
REM Set your project directory and Render deploy hook URL below,
REM or pass them as arguments.
setlocal EnableDelayedExpansion

set "PROJ_DIR=%~1"
set "RENDER_HOOK=%~2"

if "%PROJ_DIR%"=="" (
    echo Error: No project directory provided.
    echo Usage: %~nx0 "PROJECT_DIR" "RENDER_HOOK_URL"
    exit /b 1
)

if "%RENDER_HOOK%"=="" (
    echo Error: No Render deploy hook URL provided.
    exit /b 1
)

echo [Hermes Agent] Initiating Render Deployment...
echo Target: %PROJ_DIR%

cd /d "%PROJ_DIR%" 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot access directory: %PROJ_DIR%
    exit /b 1
)

echo [Status] Syncing with GitHub...
git add .
git commit -m "Auto-deployment via Hermes Agent" --allow-empty
git push origin main

echo [Status] Pinging Render...
curl -X POST "%RENDER_HOOK%"

echo.
echo [SUCCESS] Render deployment triggered!
echo Check: https://dashboard.render.com/
