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
    avatar: Mapped[str] = mapped_column(String(16), default="")  # an emoji the member picks
    frame: Mapped[str] = mapped_column(String(16), default="")  # picture frame on the leaderboard
    theme: Mapped[str] = mapped_column(String(16), default="")  # colour theme of the app for this member
    quest_starts: Mapped[list] = mapped_column(JSON, default=list)  # days a Legendary quest was started
    seen_rank: Mapped[str] = mapped_column(String(16), default="")  # last rank whose show was played ("" = not yet set)
    seen_level_gems: Mapped[int] = mapped_column(Integer, default=0)  # level/rank gems already shown at that show
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
    late: Mapped[dict] = mapped_column(JSON, default=dict)  # task -> day it was made up (ticked after the day)
    task_excuses: Mapped[dict] = mapped_column(JSON, default=dict)  # task -> reason it was excused that day
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
    cut_misses: Mapped[int] = mapped_column(Integer, default=1)  # 1 = any missed task cuts Honor
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")


class Period(Base):
    """A stretch of days (like Ramadan) when some tasks are off or have a smaller number."""
    __tablename__ = "periods"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(60))
    start: Mapped[date] = mapped_column(Date)
    end: Mapped[date] = mapped_column(Date)
    off: Mapped[list] = mapped_column(JSON, default=list)  # task keys that are paused
    numbers: Mapped[dict] = mapped_column(JSON, default=dict)  # task key -> fixed number during the period
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DailyClaim(Base):
    """A member's daily streak reward: gems claimed once a day while their streak is alive."""
    __tablename__ = "daily_claims"
    __table_args__ = (UniqueConstraint("member_id", "day", name="uq_member_claim_day"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)
    gems: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AchievementClaim(Base):
    """An achievement whose gem reward a member has collected."""
    __tablename__ = "achievement_claims"
    __table_args__ = (UniqueConstraint("member_id", "key", name="uq_member_achievement"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(24))
    gems: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Purchase(Base):
    """Something a member bought with gems (a frame, a theme or a picture)."""
    __tablename__ = "purchases"
    __table_args__ = (UniqueConstraint("member_id", "item", name="uq_member_item"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    item: Mapped[str] = mapped_column(String(40))  # e.g. "frame:galaxy", "theme:ocean", "avatar:🐉"
    price: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class TaskDef(Base):
    """One daily task, as the admin set it up in the Tasks tab."""
    __tablename__ = "tasks"
    key: Mapped[str] = mapped_column(String(24), primary_key=True)
    label: Mapped[str] = mapped_column(String(120))  # "{n}" marks the number, e.g. "{n} jumping jacks"
    group: Mapped[str] = mapped_column(String(40), default="Tasks")
    fitness: Mapped[bool] = mapped_column(Boolean, default=False)  # excused on sick days
    number: Mapped[int | None] = mapped_column(Integer, nullable=True)  # the number on start_day
    step: Mapped[int] = mapped_column(Integer, default=0)  # added every `every` days
    every: Mapped[int] = mapped_column(Integer, default=1)
    start_day: Mapped[date] = mapped_column(Date)
    next_day: Mapped[bool] = mapped_column(Boolean, default=False)  # done at night, counts for the next day
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
