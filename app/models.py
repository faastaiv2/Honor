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
    avatar_nudge: Mapped[bool] = mapped_column(Boolean, default=False)  # the admin sent "Don't forget to set your avatar"
    likes_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # last saw who liked their posts
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
    legendary_gems: Mapped[int] = mapped_column(Integer, default=1000)  # the prize for finishing the Legendary quest
    quest_day_gems: Mapped[int] = mapped_column(Integer, default=0)  # gems for each perfect day on the quest


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
    """A tournament the admin posts any time. Submissions open on `open_day` at `opens` and close on `day` at `closes`
    (the closing day identifies the tournament: its entries are filed under it)."""
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    day: Mapped[date] = mapped_column(Date, unique=True)  # the day submissions close
    open_day: Mapped[date | None] = mapped_column(Date, nullable=True)  # the day submissions open (None = `day`)
    title: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str] = mapped_column(String(200), default="")  # the theme, e.g. "Draw your favourite animal"
    opens: Mapped[str] = mapped_column(String(5), default="00:00")  # time submissions open (on open_day) and close (on day)
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
    rank_step: Mapped[int] = mapped_column(Integer, default=0)  # added to the number for every rank above Bronze
    min_rank: Mapped[str] = mapped_column(String(12), default="")  # "" = every rank; else appears from this rank on
    quest_number: Mapped[int | None] = mapped_column(Integer, nullable=True)  # the number on the Legendary quest (None: by rank)


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
    """A post on the Community tab: from a parent ("post"), or written by the app when something happens
    ("picture": a member put on a new picture, "win": 1st place in a tournament)."""
    __tablename__ = "announcements"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    kind: Mapped[str] = mapped_column(String(16), default="post")
    member_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=True, index=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text, default="")
    emoji: Mapped[str] = mapped_column(String(8), default="📣")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    author: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PostLike(Base):
    """A ❤️ on a Community post (one per person)."""
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("post_id", "who", name="uq_post_like"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    post_id: Mapped[str] = mapped_column(ForeignKey("announcements.id", ondelete="CASCADE"), index=True)
    who: Mapped[str] = mapped_column(String(48))  # "member:<id>" or "admin:<id>"
    name: Mapped[str] = mapped_column(String(80), default="")
    reaction: Mapped[str] = mapped_column(String(8), default="")  # "" = ❤️; on "left the kitten" posts: 👎 😤 or 😠
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class GobiLaunch(Base):
    """A member hit someone on the Pillar of Shame with a cauliflower (gobi): +10 gems, once a day."""
    __tablename__ = "gobi_launches"
    __table_args__ = (UniqueConstraint("launcher_id", "day", name="uq_gobi_launcher_day"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    launcher_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    victim_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)
    gems: Mapped[int] = mapped_column(Integer)
    seen: Mapped[bool] = mapped_column(Boolean, default=False)  # the person hit has seen the splat
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Temptation(Base):
    """A test the admin sends: Shaytan appears to a member and offers gems to skip the day's tasks.
    The member says yes or no; then the admin can cut Honor (shown to the member with the reason),
    post it to Community, or give a reward for refusing (also shown)."""
    __tablename__ = "temptations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    offer: Mapped[int] = mapped_column(Integer, default=50)
    auto_cut: Mapped[int] = mapped_column(Integer, default=1)  # Honor cut straight away if they say yes
    answer: Mapped[str] = mapped_column(String(8), default="")  # "", "yes" or "no"
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refusals: Mapped[int] = mapped_column(Integer, default=0)  # how many offers they turned down (up to 3)
    final_offer: Mapped[int] = mapped_column(Integer, default=0)  # the offer they said yes to (or the last one refused)
    cut: Mapped[int] = mapped_column(Integer, default=0)  # Honor taken away afterwards
    cut_seen: Mapped[bool] = mapped_column(Boolean, default=True)
    reward: Mapped[int] = mapped_column(Integer, default=0)  # gems given for refusing
    reward_seen: Mapped[bool] = mapped_column(Boolean, default=True)
    posted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Feedback(Base):
    """A member's message from the Help button: a feature idea or a bug report, for the admin."""
    __tablename__ = "feedback"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(80), default="")
    kind: Mapped[str] = mapped_column(String(10))  # "feature" or "bug"
    text: Mapped[str] = mapped_column(Text)
    page: Mapped[str] = mapped_column(String(80), default="")  # where they were when they wrote it
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    reply: Mapped[str] = mapped_column(Text, default="")  # the admin's note when it was resolved ("Added a pet shop!")
    done_seen: Mapped[bool] = mapped_column(Boolean, default=True)  # the member saw the "added because of you" pop-up
    link: Mapped[str] = mapped_column(String(40), default="")  # the page "See what's added" takes them to ("" = none)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CharityTest(Base):
    """A test the admin sends: a man in a cloak begs a member for gems. Give: he gives back more (sadaqah).
    Get lost: he throws off the cloak, he was Shaytan all along, and he laughs."""
    __tablename__ = "charity_tests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    ask: Mapped[int] = mapped_column(Integer, default=20)  # gems he begs for
    give_back: Mapped[int] = mapped_column(Integer, default=50)  # gems he returns if they give
    answer: Mapped[str] = mapped_column(String(8), default="")  # "", "give" or "refuse"
    given: Mapped[int] = mapped_column(Integer, default=0)  # gems actually given (never more than they had)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PigeonNote(Base):
    """A carrier pigeon the admin sends to a member: a thank-you note (medieval style) and a gift of gems."""
    __tablename__ = "pigeon_notes"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    sender: Mapped[str] = mapped_column(String(80), default="")  # who the note is from
    gems: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")  # empty: the standard medieval thank-you
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class BullyTest(Base):
    """A test the admin sends: a rude kid boasts and calls the member weak. They can pay 25 gems to launch a
    mega gobi at him, say something mean back, or reply kindly (he says sorry and becomes a friend)."""
    __tablename__ = "bully_tests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    answer: Mapped[str] = mapped_column(String(8), default="")  # "", "gobi", "mean", "kind" or "tell"
    paid: Mapped[int] = mapped_column(Integer, default=0)  # gems paid for the gobi (telling is refunded)
    elder: Mapped[str] = mapped_column(String(80), default="")  # who they can tell (the admin types the name)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class QuizTest(Base):
    """The quiz scroll: an owl sage brings three questions the admin wrote. Each right answer earns gems."""
    __tablename__ = "quiz_tests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    questions: Mapped[list] = mapped_column(JSON, default=list)  # [{"q": str, "options": [str], "answer": int}]
    gems_each: Mapped[int] = mapped_column(Integer, default=10)
    answers: Mapped[list] = mapped_column(JSON, default=list)  # the member's choice for each question (-1 = not yet)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class KittenTest(Base):
    """A test the admin sends: a thirsty kitten in the desert. Water costs every gem the member has (given back
    once they've chosen to give it) and unlocks a secret achievement and the Pharaoh Cat. Walking past costs nothing."""
    __tablename__ = "kitten_tests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    answer: Mapped[str] = mapped_column(String(8), default="")  # "", "water" or "walk"
    gems: Mapped[int] = mapped_column(Integer, default=0)  # what they were ready to give
    posted: Mapped[bool] = mapped_column(Boolean, default=False)  # the admin posted "left the kitten" to Community
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Poll(Base):
    """A survey or poll the admin asks the family. One or more answers can be picked."""
    __tablename__ = "polls"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    question: Mapped[str] = mapped_column(String(200))
    options: Mapped[list] = mapped_column(JSON, default=list)  # the answers to choose from
    multi: Mapped[bool] = mapped_column(Boolean, default=False)  # pick more than one
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)  # the admin doesn't see who picked what
    show_results: Mapped[bool] = mapped_column(Boolean, default=True)  # members see the results after voting
    closed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PollVote(Base):
    __tablename__ = "poll_votes"
    __table_args__ = (UniqueConstraint("poll_id", "member_id", name="uq_poll_vote"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    poll_id: Mapped[str] = mapped_column(ForeignKey("polls.id", ondelete="CASCADE"), index=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"))
    choices: Mapped[list] = mapped_column(JSON, default=list)  # indexes into the poll's options
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
