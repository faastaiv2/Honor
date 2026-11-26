import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, LargeBinary, String, Text, UniqueConstraint
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
    theme: Mapped[str] = mapped_column(String(16), default="white")  # the parent's own look: "white" or "dark"
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
    oath_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # swore the Oath of Honor
    toured: Mapped[bool] = mapped_column(Boolean, default=False)  # saw the welcome tour
    oath_note: Mapped[str] = mapped_column(String(160), default="")  # why the oath must be sworn again
    early_ticks: Mapped[int] = mapped_column(Integer, default=0)  # tries to tick a task before its time
    gems_stolen: Mapped[int] = mapped_column(Integer, default=0)  # taken by goblins on falls to the Pillar of Shame
    raid_owed: Mapped[int] = mapped_column(Integer, default=-1)  # gems taken in a raid not yet shown (-1 = none)
    godfather: Mapped[bool] = mapped_column(Boolean, default=False)
    godfather_seen: Mapped[bool] = mapped_column(Boolean, default=False)  # has seen the "You are a Godfather" show  # chosen by the admin; only they get the Godfather frame
    news_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # last read announcements
    raid_depth: Mapped[int] = mapped_column(Integer, default=0)  # the deepest level raided on this fall (0 = not on the Pillar)
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
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # when every task got done
    watched: Mapped[list] = mapped_column(JSON, default=list)  # tasks whose video (▶ Watch) was opened that day
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    updated_by: Mapped[str] = mapped_column(String(120), default="")


class GemGrant(Base):
    """Gems a parent gave (+) or took (−) by hand, with a reason."""
    __tablename__ = "gem_grants"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    delta: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    created_by: Mapped[str] = mapped_column(String(120), default="")


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
    members: Mapped[list] = mapped_column(JSON, default=list)  # who it applies to; empty = everyone
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Event(Base):
    """A tournament the admin sets up for a day (usually a Saturday), with a theme for the kids."""
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    day: Mapped[date] = mapped_column(Date, unique=True)
    title: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str] = mapped_column(String(200), default="")  # the theme, e.g. "Draw your favourite animal"
    opens: Mapped[str] = mapped_column(String(5), default="00:00")  # time of day it opens and closes
    closes: Mapped[str] = mapped_column(String(5), default="23:59")
    prize1: Mapped[int] = mapped_column(Integer, default=100)
    prize2: Mapped[int] = mapped_column(Integer, default=50)
    prize3: Mapped[int] = mapped_column(Integer, default=25)
    fee: Mapped[int] = mapped_column(Integer, default=0)  # gems to enter
    banner: Mapped[str] = mapped_column(String(16), default="sunset")  # a preset, or "custom" with banner_image
    banner_image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    banner_mime: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class EventEntry(Base):
    """A member's picture in a Saturday art tournament; parents pick 1st, 2nd and 3rd."""
    __tablename__ = "event_entries"
    __table_args__ = (UniqueConstraint("event_day", "member_id", name="uq_event_member"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    event_day: Mapped[date] = mapped_column(Date, index=True)  # the Saturday
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(80), default="")
    mime: Mapped[str] = mapped_column(String(20), default="image/jpeg")
    image: Mapped[bytes] = mapped_column(LargeBinary)
    place: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1, 2 or 3
    gems: Mapped[int] = mapped_column(Integer, default=0)
    win_seen: Mapped[bool] = mapped_column(Boolean, default=False)  # the winner has seen their celebration
    fee_paid: Mapped[int] = mapped_column(Integer, default=0)  # gems paid to enter (given back if withdrawn)
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
    not_before: Mapped[str | None] = mapped_column(String(5), nullable=True)  # "12:00": can't be ticked earlier
    links: Mapped[list] = mapped_column(JSON, default=list)  # 7 video links, Monday … Sunday ("" = none)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Media(Base):
    """Files the parent uploads for the app (like the Legendary quest music). Kept in the database, not in the code."""
    __tablename__ = "media"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    mime: Mapped[str] = mapped_column(String(40))
    data: Mapped[bytes] = mapped_column(LargeBinary)
    start: Mapped[int] = mapped_column(Integer, default=0)  # seconds into the track to start playing
    end: Mapped[int] = mapped_column(Integer, default=0)  # seconds into the track to stop (0 = play to the end)
    offset_ms: Mapped[int] = mapped_column(Integer, default=0)  # when in the animation: later (+) or earlier (-) than its usual moment
    volume: Mapped[int] = mapped_column(Integer, default=80)  # percent
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class GemTake(Base):
    """A member took gems from someone on the Pillar of Shame (once a day per pair)."""
    __tablename__ = "gem_takes"
    __table_args__ = (UniqueConstraint("taker_id", "victim_id", "day", name="uq_take_pair_day"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    taker_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    victim_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)
    gems: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Announcement(Base):
    """News from the parents, shown on the Announcements tab."""
    __tablename__ = "announcements"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text, default="")
    emoji: Mapped[str] = mapped_column(String(8), default="📣")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    author: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
