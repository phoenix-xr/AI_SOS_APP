import sys
from pathlib import Path

# Add backend-h and backend-h/src to python path for root-level deployment environments
backend_dir = Path(__file__).resolve().parent / "backend-h"
src_path = backend_dir / "src"

for path in [backend_dir, src_path]:
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from backend_h.main import app

__all__ = ["app"]
