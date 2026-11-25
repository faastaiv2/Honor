"""Board logic that needs the database: settings, today's date, Honor totals, the leaderboard."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import scoring
from app.models import Adjustment, AppSettings, DayLog, Member


def get_settings_row(db: Session) -> AppSettings:
    row = db.get(AppSettings, 1)
    if row is None:
        row = AppSettings(id=1)
        db.add(row)
        db.commit()
    return row


def today_for(cfg: AppSettings) -> date:
    try:
        tz = ZoneInfo(cfg.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def active_members(db: Session) -> list[Member]:
    return list(db.scalars(select(Member).where(Member.active.is_(True)).order_by(Member.sort_order, Member.name)))


def logs_between(db: Session, start: date, end: date) -> dict[tuple[str, date], DayLog]:
    rows = db.scalars(select(DayLog).where(DayLog.day >= start, DayLog.day <= end))
    return {(r.member_id, r.day): r for r in rows}


def honor_totals(db: Session, cfg: AppSettings, members: list[Member], today: date) -> dict[str, int]:
    logs = logs_between(db, cfg.score_from, today)
    adj = dict(db.execute(select(Adjustment.member_id, func.sum(Adjustment.delta)).group_by(Adjustment.member_id)).all())
    out = {}
    for m in members:
        h = m.base_honor + int(adj.get(m.id) or 0)
        for d in scoring.date_range(cfg.score_from, today):
            log = logs.get((m.id, d))
            h += scoring.score_day(d, log.tasks if log else None, log.excuse if log else None, today, cfg.cut_misses).delta
        out[m.id] = h
    return out


def can_edit_day(is_admin: bool, d: date, today: date) -> bool:
    """Members may tick today and yesterday; parents may change any day up to today."""
    if d > today:
        return False
    return is_admin or d >= today - timedelta(days=1)


def tier_dict(h: int) -> dict:
    t = scoring.tier_of(h)
    nx = scoring.next_tier(h)
    return {
        "emoji": t[1], "name": t[2], "color": t[3], "min": t[0] if t[0] > -10**8 else None,
        "next": {"emoji": nx[1], "name": nx[2], "min": nx[0], "needed": nx[0] - h} if nx else None,
    }
