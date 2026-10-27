import sys
from pathlib import Path

# Ensure 'src' is in python path for module imports
src_path = Path(__file__).resolve().parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from backend_h.main import app

__all__ = ["app"]
