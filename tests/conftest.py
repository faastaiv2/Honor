import os
from datetime import datetime, timezone

os.environ.setdefault("BCRYPT_ROUNDS", "4")  # fast hashing in tests; must be set before the app is imported
os.environ["RUN_MIGRATIONS"] = "false"  # tests build their own in-memory database

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Admin, AppSettings, Member  # noqa: E402
from app.ratelimit import login_limiter  # noqa: E402
from app.security import hash_secret  # noqa: E402


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db):
    def override():
        yield db

    app.dependency_overrides[get_db] = override
    login_limiter._hits.clear()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def family(db):
    """One parent and three members with PINs; scoring from 2026-11-22, board time zone UTC."""
    db.add(AppSettings(id=1))
    db.add(Admin(email="parent@example.com", name="Parent", password_hash=hash_secret("parent-password-1")))
    joined = datetime(2026, 11, 1, tzinfo=timezone.utc)  # long before the test days
    ms = [Member(name=n, code=c, base_honor=b, sort_order=i, pin_hash=hash_secret("1234"), created_at=joined)
          for i, (n, c, b) in enumerate([("Alpha", "A", 10), ("Bravo", "B", 5), ("Sierra", "S", 26)])]
    db.add_all(ms)
    db.commit()
    return {m.code: m for m in ms}


def auth(client, member=None, admin=False):
    if admin:
        r = client.post("/api/auth/admin", json={"email": "parent@example.com", "password": "parent-password-1"})
    else:
        r = client.post("/api/auth/member", json={"member_id": member.id, "pin": "1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


@pytest.fixture(autouse=True)
def _afternoon(monkeypatch):
    """Tests run as if it's 1 PM, so time-of-day rules (Asr from 12:00) don't depend on when they run."""
    import app.routers.board as board_mod
    monkeypatch.setattr(board_mod, "clock_for", lambda cfg: "13:00")
