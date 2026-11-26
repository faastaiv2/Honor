"""Board logic that needs the database: settings, today's date, levels, the leaderboard."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import scoring
from app.makeup import week_start
from app.models import Adjustment, AppSettings, DayLog, Member
from app.progress import Progress, simulate
from app.tiers import tier_for



def get_settings_row(db: Session) -> AppSettings:
    row = db.get(AppSettings, 1)
    if row is None:
        try:
            db.add(AppSettings(id=1))
            db.commit()
        except IntegrityError:  # another request created it at the same moment
            db.rollback()
        row = db.get(AppSettings, 1)
    return row


def zone(cfg: AppSettings) -> ZoneInfo:
    try:
        return ZoneInfo(cfg.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def today_for(cfg: AppSettings) -> date:
    return datetime.now(zone(cfg)).date()


def clock_for(cfg: AppSettings) -> str:
    """The board's time of day now, as "HH:MM"."""
    return datetime.now(zone(cfg)).strftime("%H:%M")


def week_info(today: date, score_from: date) -> dict:
    """Week 1 is the week (Sunday to Saturday) in which the board started scoring."""
    start = week_start(today)
    number = max(1, (start - week_start(score_from)).days // 7 + 1)
    return {"number": number, "start": start.isoformat(), "days_left": (start + timedelta(days=6) - today).days}


def active_members(db: Session) -> list[Member]:
    return list(db.scalars(select(Member).where(Member.active.is_(True)).order_by(Member.sort_order, Member.name)))


def logs_between(db: Session, start: date, end: date, member_id: str | None = None) -> dict[tuple[str, date], DayLog]:
    q = select(DayLog).where(DayLog.day >= start, DayLog.day <= end)
    if member_id:
        q = q.where(DayLog.member_id == member_id)
    return {(r.member_id, r.day): r for r in db.scalars(q)}


def load_tasks(db: Session) -> list[scoring.TaskSpec]:
    """The daily tasks as the admin set them up (the sheet's tasks if none are stored)."""
    from app.models import TaskDef
    rows = list(db.scalars(select(TaskDef).order_by(TaskDef.sort_order, TaskDef.key)))
    if not rows:
        return list(scoring.DEFAULT_SPECS)
    return [scoring.TaskSpec(r.key, r.label, r.group, r.fitness, r.number, r.step, r.every, r.start_day, r.next_day,
                             r.not_before) for r in rows]


def load_periods(db: Session) -> list:
    """Special periods (like Ramadan) when tasks are paused or smaller."""
    from app.models import Period
    return list(db.scalars(select(Period).order_by(Period.start)))


def member_start(cfg: AppSettings, m: Member) -> date:
    """Scoring for a member starts on the board's start date, or the day they were added if later,
    so nobody loses Honor for days before they joined."""
    if not m.created_at:
        return cfg.score_from
    created = m.created_at if m.created_at.tzinfo else m.created_at.replace(tzinfo=ZoneInfo("UTC"))
    return max(cfg.score_from, created.astimezone(zone(cfg)).date())


def quest_start(s: str) -> tuple[date, datetime | None]:
    """A stored quest start: "2026-11-25" (older) or "2026-11-25@2026-11-25T14:03:00+00:00" (day, then the moment)."""
    day, _, moment = s.partition("@")
    return date.fromisoformat(day), (datetime.fromisoformat(moment) if moment else None)


def progress_for(db: Session, cfg: AppSettings, members: list[Member], today: date) -> dict[str, Progress]:
    logs = logs_between(db, cfg.score_from, today)
    tz = zone(cfg)
    adj_rows: dict[str, list[tuple[date, datetime, int]]] = {}
    for a in db.scalars(select(Adjustment)):
        created = a.created_at if a.created_at.tzinfo else a.created_at.replace(tzinfo=ZoneInfo("UTC"))
        adj_rows.setdefault(a.member_id, []).append((created.astimezone(tz).date(), created, a.delta))
    week_from = week_start(today)
    tasks = load_tasks(db)
    periods = load_periods(db)
    out = {}
    for m in members:
        start = member_start(cfg, m)
        mine = {d: (l.tasks, l.excuse, l.task_excuses or {}) for (mid, d), l in logs.items() if mid == m.id}
        quests = [quest_start(s) for s in (m.quest_starts or [])]
        starts = [d for d, _ in quests]
        adj: dict[date, int] = {}
        for d, created, delta in adj_rows.get(m.id, []):
            # Starting the quest wipes the slate: changes made earlier that day no longer count.
            if any(d == qd and (at is None or created < at) for qd, at in quests):
                continue
            adj[d] = adj.get(d, 0) + delta
        out[m.id] = simulate(m.base_honor, mine, adj, starts, start, today, cfg.cut_misses, week_from, tasks, scoring.for_member(periods, m.id))
    return out


def tier_of_progress(p: Progress):
    return tier_for(p.level, p.legendary)


def can_start_quest(p: Progress) -> bool:
    return not p.legendary and not p.banned and p.quest_start is None and tier_of_progress(p).key == "obsidian"


def owned_items(db: Session, member_id: str) -> set[str]:
    from app.models import Purchase
    return {r.item for r in db.scalars(select(Purchase).where(Purchase.member_id == member_id))}


def gems_claimed(db: Session, member_id: str) -> int:
    from sqlalchemy import func

    from app.models import DailyClaim, EventEntry, GemTake
    chests = db.scalar(select(func.coalesce(func.sum(DailyClaim.gems), 0)).where(DailyClaim.member_id == member_id)) or 0
    prizes = db.scalar(select(func.coalesce(func.sum(EventEntry.gems), 0)).where(EventEntry.member_id == member_id)) or 0
    taken = db.scalar(select(func.coalesce(func.sum(GemTake.gems), 0)).where(GemTake.taker_id == member_id)) or 0
    return int(chests) + int(prizes) + int(taken)  # streak chests, tournament prizes, gems taken from the Pillar of Shame


def achievement_gems(db: Session, member_id: str) -> tuple[int, set[str]]:
    """Gems collected from achievements, and which ones."""
    from app.models import AchievementClaim
    rows = list(db.scalars(select(AchievementClaim).where(AchievementClaim.member_id == member_id)))
    return sum(r.gems for r in rows), {r.key for r in rows}


def chests_opened(db: Session, member_id: str) -> int:
    from sqlalchemy import func

    from app.models import DailyClaim
    return int(db.scalar(select(func.count()).select_from(DailyClaim).where(DailyClaim.member_id == member_id)) or 0)


def claimed_on(db: Session, member_id: str, day: date) -> bool:
    from app.models import DailyClaim
    return db.scalar(select(DailyClaim.id).where(DailyClaim.member_id == member_id, DailyClaim.day == day)) is not None


def gems_spent(db: Session, member_id: str) -> int:
    from sqlalchemy import func

    from app.models import EventEntry, Purchase
    shop = db.scalar(select(func.coalesce(func.sum(Purchase.price), 0)).where(Purchase.member_id == member_id)) or 0
    fees = db.scalar(select(func.coalesce(func.sum(EventEntry.fee_paid), 0)).where(EventEntry.member_id == member_id)) or 0
    from app.models import Member
    from app.models import GemTake
    stolen = db.scalar(select(Member.gems_stolen).where(Member.id == member_id)) or 0
    lost = db.scalar(select(func.coalesce(func.sum(GemTake.gems), 0)).where(GemTake.victim_id == member_id)) or 0
    return int(shop) + int(fees) + int(stolen) + int(lost)  # shop, entry fees, goblin raids, gems taken by others


def gem_balance(db: Session, cfg: AppSettings, m: Member) -> int:
    """A member's gems right now: earned (tasks, levels, ranks) + chests and prizes + achievements - spent."""
    from app.progress import gems_earned
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    return gems_earned(p) + gems_claimed(db, m.id) + achievement_gems(db, m.id)[0] - gems_spent(db, m.id)
