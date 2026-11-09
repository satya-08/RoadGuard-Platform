import os
import sys
from pathlib import Path

# Add repository root and roadguard-platform to sys.path
REPO_ROOT = Path(__file__).resolve().parent
platform_path = REPO_ROOT / "roadguard-platform"

if str(platform_path) not in sys.path:
    sys.path.insert(0, str(platform_path))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Direct import now works with complete package hierarchy
from roadguard.backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
