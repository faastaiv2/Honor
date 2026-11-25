from fastapi import APIRouter
from sqlalchemy import text

from app.config import DEFAULT_SECRET, get_settings
from app.db import engine

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """Is the server set up? Never shows secret values."""
    from app.main import STARTUP_PROBLEMS, _state, ensure_ready

    ensure_ready()  # retries a failed set-up (at most every few seconds)

    s = get_settings()
    out: dict = {"status": "ok", "env": s.env,
                 "secret_key": "ok" if s.secret_key != DEFAULT_SECRET and len(s.secret_key) >= 32 else "missing or too short",
                 "admin_account_settings": "set" if s.admin_email and s.admin_password else "not set (fine after first sign-in)",
                 "database_kind": "postgresql" if s.database_url.startswith("postgresql") else "sqlite"}
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        out["database"] = "ok"
    except Exception as e:  # report the kind of failure only, never the address
        out["database"] = f"cannot connect ({type(e).__name__})"
    out["setup"] = "done" if _state["ready"] else "not done yet"
    if STARTUP_PROBLEMS:
        out["status"] = "needs setup"
        out["problems"] = STARTUP_PROBLEMS
    return out
