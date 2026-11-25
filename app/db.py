from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

if settings.database_url.startswith("sqlite"):
    _connect_args: dict = {"check_same_thread": False}
else:
    # Neon's pooled connections (PgBouncer) do not keep server-side prepared statements.
    _connect_args = {"prepare_threshold": None}
engine = create_engine(settings.database_url, connect_args=_connect_args, pool_pre_ping=True, pool_size=2,
                       max_overflow=3, pool_recycle=300) if not settings.database_url.startswith("sqlite") else \
    create_engine(settings.database_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
