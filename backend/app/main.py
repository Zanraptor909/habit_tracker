# app/main.py
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

from app.core.config import settings
from app.routers import auth as auth_router
from app.routers import habits as habits_router
from app.routers import streaks as streaks_router  # 👈 add

# Create FastAPI app
app = FastAPI(
    title="Habit Tracker API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS (send cookies from the frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB: asyncpg pool on startup/shutdown ---
@app.on_event("startup")
async def startup_pool():
    app.state.pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL, min_size=1, max_size=5)
    # DEBUG: list mounted routes so we can see duplicates/types
    for r in app.router.routes:
        try:
            path = getattr(r, "path", "")
            name = getattr(r, "name", "")
            methods = getattr(r, "methods", set())
            print(f"[ROUTE] {methods} {path} -> {name}")
        except Exception:
            pass


@app.on_event("shutdown")
async def shutdown_pool():
    pool = getattr(app.state, "pool", None)
    if pool:
        await pool.close()

# --- Routers (this brings in ALL your endpoints) ---
# Auth:
#   POST /auth/google
#   GET  /me
#   POST /logout
app.include_router(auth_router.router, tags=["auth"])

# Habits:
#   GET  /api/checklist/today
#   POST /api/habit_log
#   POST /api/habits
app.include_router(habits_router.router, prefix="/api", tags=["habits"])

# Streaks:
#   GET  /api/stats/daily_completion
app.include_router(streaks_router.router, prefix="/api", tags=["streaks"])

# --- Basic health check ---
@app.get("/health", tags=["meta"])
def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}

# Optional: a friendly root
@app.get("/", tags=["meta"])
def root():
    return {
        "name": "Habit Tracker API",
        "docs": "/docs",
        "auth_endpoints": ["/auth/google", "/me", "/logout"],
        "habit_endpoints": [
            "/api/checklist/today",
            "/api/habit_log",
            "/api/habits",
        ],
        "streak_endpoints": [
            "/api/stats/daily_completion",
        ],
    }
