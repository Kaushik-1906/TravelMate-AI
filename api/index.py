"""Vercel serverless entrypoint for the TravelMate AI FastAPI backend.

Vercel loads the top-level ``app`` object as an ASGI application and routes
requests to it. The backend package lives in ``backend/app`` so that the same
code can also be deployed to a traditional host (Render, Railway, a VPS) with
``uvicorn app.main:app``.

Local development does not use this file: run ``uvicorn app.main:app`` from the
``backend`` directory instead.
"""

import os
import sys

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from app.main import app  # noqa: E402  (import after sys.path setup)

__all__ = ["app"]
