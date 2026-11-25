"""Board logic that needs the database: settings, today's date, levels, the leaderboard."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scoring
from app.makeup import week_start
from app.models import Adjustment, AppSettings, DayLog, Member
from app.progress import Progress, simulate
from app.tiers import tier_for

WEEK_ONE = week_start(scoring.PROGRAM_START)


def get_settings_row(db: Session) -> AppSettings:
    row = db.get(AppSettings, 1)
    if row is None:
        row = AppSettings(id=1)
        db.add(row)
        db.commit()
    return row


def zone(cfg: AppSettings) -> ZoneInfo:
    try:
        return ZoneInfo(cfg.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def today_for(cfg: AppSettings) -> date:
    return datetime.now(zone(cfg)).date()


def week_info(today: date) -> dict:
    start = week_start(today)
    return {"number": (start - WEEK_ONE).days // 7 + 1, "start": start.isoformat(),
            "days_left": (start + timedelta(days=6) - today).days}


def active_members(db: Session) -> list[Member]:
    return list(db.scalars(select(Member).where(Member.active.is_(True)).order_by(Member.sort_order, Member.name)))


def logs_between(db: Session, start: date, end: date, member_id: str | None = None) -> dict[tuple[str, date], DayLog]:
    q = select(DayLog).where(DayLog.day >= start, DayLog.day <= end)
    if member_id:
        q = q.where(DayLog.member_id == member_id)
    return {(r.member_id, r.day): r for r in db.scalars(q)}


def progress_for(db: Session, cfg: AppSettings, members: list[Member], today: date) -> dict[str, Progress]:
    logs = logs_between(db, cfg.score_from, today)
    tz = zone(cfg)
    adj: dict[str, dict[date, int]] = {}
    for a in db.scalars(select(Adjustment)):
        created = a.created_at if a.created_at.tzinfo else a.created_at.replace(tzinfo=ZoneInfo("UTC"))
        d = created.astimezone(tz).date()
        adj.setdefault(a.member_id, {}).setdefault(d, 0)
        adj[a.member_id][d] += a.delta
    week_from = week_start(today)
    out = {}
    for m in members:
        mine = {d: (l.tasks, l.excuse) for (mid, d), l in logs.items() if mid == m.id}
        starts = [date.fromisoformat(s) for s in (m.quest_starts or [])]
        out[m.id] = simulate(m.base_honor, mine, adj.get(m.id, {}), starts, cfg.score_from, today, cfg.cut_misses,
                             week_from)
    return out


def tier_of_progress(p: Progress):
    return tier_for(p.level, p.legendary)


def can_start_quest(p: Progress) -> bool:
    return not p.legendary and not p.banned and p.quest_start is None and tier_of_progress(p).key == "diamond"
