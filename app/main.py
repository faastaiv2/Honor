import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.config import DEFAULT_SECRET, get_settings
from app.db import SessionLocal
from app.models import Admin
from app.routers import admin, auth, board, health
from app.security import hash_secret

settings = get_settings()

# Problems found at start-up. They are shown (without secret values) at /api/health,
# and the rest of the API refuses to work until they are fixed.
STARTUP_PROBLEMS: list[str] = []
if settings.is_production and (settings.secret_key == DEFAULT_SECRET or len(settings.secret_key) < 32):
    STARTUP_PROBLEMS.append("SECRET_KEY is missing or shorter than 32 characters")
if settings.is_production and settings.database_url.startswith("sqlite"):
    STARTUP_PROBLEMS.append("DATABASE_URL is not set (connect the Neon database to this project)")


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
    log = logging.getLogger("honor")
    if settings.run_migrations and not STARTUP_PROBLEMS:
        try:
            run_migrations()
        except Exception as e:  # keep serving; the error shows in the logs and /api/health
            log.exception("Database migration failed")
            STARTUP_PROBLEMS.append(f"Database setup failed ({type(e).__name__}); see the Logs tab")
    if not STARTUP_PROBLEMS:
        try:
            ensure_first_admin()
        except Exception as e:
            log.exception("Creating the first parent account failed")
            STARTUP_PROBLEMS.append(f"Creating the first parent account failed ({type(e).__name__})")
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
async def refuse_when_misconfigured(request, call_next):
    if STARTUP_PROBLEMS and request.url.path.startswith("/api/") and request.url.path != "/api/health":
        return JSONResponse({"detail": "The server is not set up yet: " + "; ".join(STARTUP_PROBLEMS)}, status_code=503)
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
