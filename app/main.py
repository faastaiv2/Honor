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

if settings.is_production and (settings.secret_key == DEFAULT_SECRET or len(settings.secret_key) < 32):
    raise RuntimeError("SECRET_KEY must be set to a long random value in production")


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
    if settings.run_migrations:
        try:
            run_migrations()
        except Exception:  # keep serving; the error shows in the logs and /api/health
            logging.getLogger("honor").exception("Database migration failed")
    ensure_first_admin()
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
