import os
import sys
from pathlib import Path

# Automatically inject roadguard-platform into Python's module search path
REPO_ROOT = Path(__file__).resolve().parent
candidates = [
    REPO_ROOT / "roadguard-platform",
    REPO_ROOT / "roadguard-platform" / "roadguard",
    REPO_ROOT / "roadguard",
    REPO_ROOT,
]
for p in candidates:
    if p.exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from roadguard.backend.app.main import app
except ModuleNotFoundError:
    try:
        from backend.app.main import app
    except ModuleNotFoundError:
        from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
