# Render Deployment Templates

## render.yaml Template
```yaml
services:
  - type: web
    name: <service-name>
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENAI_API_KEY
        sync: false  # Set manually in Render dashboard
      - key: PYTHON_VERSION
        value: 3.11.0
```

## config.py Port Fix
```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OpenRouter API configuration
    openai_api_key: str
    openai_base_url: str = "https://openrouter.ai/api/v1"
    openai_model: str = "stepfun/step-3.5-flash"

    # Server configuration (uses Render's PORT env var)
    app_host: str = "0.0.0.0"
    app_port: int = int(os.environ.get("PORT", 8000))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

## .gitignore for Python Backends
```
# Environment variables
.env
.env.local

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/

# Logs
*.log
```
