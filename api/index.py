"""
Vercel Python Serverless Function - Entrypoint
Imports and re-exports the FastAPI application from the backend package.
"""
import sys
from pathlib import Path

# Add the backend directory to the Python path so the app module can be imported
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.main import app

# Vercel ASGI handler will use this app instance
