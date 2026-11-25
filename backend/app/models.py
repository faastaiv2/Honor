import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _id() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Admin(Base):
    """A parent account: signs in with email and password and manages everything."""
    __tablename__ = "admins"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Member(Base):
    """Someone on the leaderboard. Signs in by choosing their name and typing a PIN."""
    __tablename__ = "members"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(80))
    code: Mapped[str] = mapped_column(String(4))  # initials used in the sheet, e.g. "S", "Am"
    base_honor: Mapped[int] = mapped_column(Integer, default=1)  # level on the day before scoring starts
    pin_hash: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DayLog(Base):
    """What one member ticked on one day."""
    __tablename__ = "day_logs"
    __table_args__ = (UniqueConstraint("member_id", "day", name="uq_member_day"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    tasks: Mapped[list] = mapped_column(JSON, default=list)
    excuse: Mapped[str] = mapped_column(String(120), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    updated_by: Mapped[str] = mapped_column(String(120), default="")


class Adjustment(Base):
    """A manual Honor change made by a parent, with a reason."""
    __tablename__ = "adjustments"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    delta: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    created_by: Mapped[str] = mapped_column(String(120), default="")


class AppSettings(Base):
    """One row of board-wide settings."""
    __tablename__ = "app_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    score_from: Mapped[date] = mapped_column(Date, default=date(2026, 11, 22))
    cut_misses: Mapped[int] = mapped_column(Integer, default=5)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
