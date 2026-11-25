import logging
import os
import re
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.config import DEFAULT_SECRET, get_settings
from app.db import SessionLocal
from app.models import Admin
from app.routers import admin, auth, board, health
from app.security import hash_secret

settings = get_settings()

# Settings problems (fixed only by changing Vercel's environment variables and redeploying).
CONFIG_PROBLEMS: list[str] = []
_on_vercel = bool(os.environ.get("VERCEL"))
if _on_vercel and not settings.is_production:
    CONFIG_PROBLEMS.append("ENV is not set to production in this Vercel project's Environment Variables")
if _on_vercel and settings.database_url.startswith("sqlite"):
    CONFIG_PROBLEMS.append("DATABASE_URL is not set in this Vercel project (connect the Neon database under Storage)")
if (settings.is_production or _on_vercel) and (settings.secret_key == DEFAULT_SECRET or len(settings.secret_key) < 32):
    CONFIG_PROBLEMS.append("SECRET_KEY is missing or shorter than 32 characters")
if settings.is_production and not _on_vercel and settings.database_url.startswith("sqlite"):
    CONFIG_PROBLEMS.append("DATABASE_URL is not set (connect the Neon database to this project)")

# Database set-up is retried: a free Neon database sleeps when idle and can refuse the first
# connection while it wakes up, so one failure must not leave the server broken.
STARTUP_PROBLEMS: list[str] = list(CONFIG_PROBLEMS)
_ready = threading.Lock()
_state = {"ready": False, "last_try": 0.0}
RETRY_SECONDS = 5


def _short(e: Exception) -> str:
    msg = str(getattr(e, "orig", None) or e).strip().splitlines()[0] if str(e).strip() else ""
    msg = re.sub(r'"[^"]*\.(neon\.tech|amazonaws\.com|vercel-storage\.com)[^"]*"', '"<database host>"', msg)
    return f"{type(e).__name__}: {msg[:160]}" if msg else type(e).__name__


def ensure_ready(force: bool = False) -> bool:
    """Run migrations and create the first parent account once; retry after a failure."""
    if _state["ready"]:
        return True
    if CONFIG_PROBLEMS:
        return False
    with _ready:
        if _state["ready"]:
            return True
        if not force and time.monotonic() - _state["last_try"] < RETRY_SECONDS:
            return False
        _state["last_try"] = time.monotonic()
        log = logging.getLogger("honor")
        last: Exception | None = None
        for attempt in range(3):
            try:
                if settings.run_migrations:
                    run_migrations()
                ensure_first_admin()
                _state["ready"] = True
                STARTUP_PROBLEMS.clear()
                return True
            except Exception as e:  # noqa: BLE001 — reported at /api/health and in the logs
                last = e
                log.warning("Database set-up attempt %s failed: %s", attempt + 1, _short(e))
                time.sleep(1.5 * (attempt + 1))
        log.error("Database set-up failed", exc_info=last)
        STARTUP_PROBLEMS[:] = [f"Database setup failed ({_short(last)}). It is retried automatically; "
                               "if this stays, check the Logs tab"]
        return False


def ensure_first_admin() -> None:
    """Create the first parent account from ADMIN_EMAIL / ADMIN_PASSWORD when there is none yet."""
    if not (settings.admin_email and settings.admin_password):
        return
    with SessionLocal() as db:
        if db.scalar(select(Admin).limit(1)) is None:
            db.add(Admin(email=settings.admin_email.strip().lower(), name=settings.admin_name,
                         password_hash=hash_secret(settings.admin_password)))
            db.commit()


ROOT = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    """Bring the database up to date. On Vercel this runs when a new instance starts."""
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_ready(force=True)
    yield


app = FastAPI(
    title="Honor API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def refuse_when_not_ready(request, call_next):
    path = request.url.path
    if path.startswith("/api/") and path != "/api/health" and not _state["ready"]:
        ok = await run_in_threadpool(ensure_ready)
        if not ok:
            return JSONResponse({"detail": "The server is not set up yet: " + "; ".join(STARTUP_PROBLEMS)},
                                status_code=503)
    return await call_next(request)


for r in (health.router, auth.router, board.router, admin.router):
    app.include_router(r, prefix="/api")


@app.api_route("/api/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
def api_not_found(rest: str):
    return JSONResponse({"detail": "Not found"}, status_code=404)


# The built website (frontend/dist). On Vercel these files are served from the CDN;
# any path that is not a file gets index.html so the React app can route it.
_site = ROOT / "frontend" / "dist"
if (_site / "index.html").exists():
    app.frontend("/", directory=str(_site), fallback="index.html")
else:
    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"service": "Honor API", "status": "running", "note": "Run the website with `npm run dev` in frontend/"}
