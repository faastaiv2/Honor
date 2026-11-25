from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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


@asynccontextmanager
async def lifespan(_: FastAPI):
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


# The built website is served by the same server, so one Render service hosts everything.
_static = Path(settings.static_dir) if settings.static_dir else None
if _static and (_static / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=_static / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = (_static / path).resolve()
        if path and f.is_file() and _static.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(_static / "index.html", headers={"Cache-Control": "no-cache"})
else:
    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"service": "Honor API", "status": "running", "note": "Run the website with `npm run dev` in frontend/"}
