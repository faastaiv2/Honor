from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.deps import Viewer, current_viewer
from app.makeup import check_week, remaining, week_start
from app.models import DailyClaim, DayLog, Member, Purchase
from app.progress import Progress, gems_earned
from app.services import (active_members, can_start_quest, claimed_on, gems_claimed, gems_spent, get_settings_row, load_tasks, logs_between,
                          member_start, owned_items, progress_for, tier_of_progress, today_for, week_info)
from app.tiers import (CAP_WITHOUT_LEGENDARY, DAILY_CLAIM, FRAME_KEYS, GEMS_FOR_FULL_DAY, GEMS_PER_LEVEL, GEMS_PER_TASK, RANK_GEMS, THEME_KEYS,
                       FREE_AVATARS, TIERS, catalogue, item_available, next_tier, price_of, roman, shop_key, tier_dict,
                       tier_for)

router = APIRouter(prefix="/board", tags=["board"])

AVATARS = FREE_AVATARS


class DayUpdate(BaseModel):
    member_id: str
    date: date
    tasks: list[str] = Field(default_factory=list, max_length=40)
    excuse: str = Field(default="", max_length=120)


class AvatarIn(BaseModel):
    avatar: str = Field(max_length=16)


class ProfileIn(BaseModel):
    avatar: str | None = Field(default=None, max_length=16)
    frame: str | None = Field(default=None, max_length=16)
    theme: str | None = Field(default=None, max_length=16)


class BuyIn(BaseModel):
    kind: str = Field(pattern="^(frame|theme|avatar)$")
    key: str = Field(max_length=16)


class QuestIn(BaseModel):
    member_id: str


def _score_out(s: scoring.DayScore) -> dict:
    return {"gain": s.gain, "bonus": s.bonus, "cut": s.cut, "delta": s.delta, "done": s.done, "of": s.of,
            "weekend": s.weekend, "excused": s.excused}


def _level_label(p: Progress) -> str:
    return "L" if p.legendary else roman(p.level)


def _status(p: Progress) -> dict:
    t = tier_of_progress(p)
    nx = None if p.legendary else next_tier(t)
    if nx and nx.key == "legendary":
        nx = None  # Legendary is only reached through the quest
    return {
        "level": p.level, "label": _level_label(p), "tier": tier_dict(t), "legendary": p.legendary,
        "pending": p.pending,
        "banned": p.banned, "quest": {"active": p.quest_start is not None,
                                      "start": p.quest_start.isoformat() if p.quest_start else None,
                                      "days": p.quest_days,
                                      "broken_on": p.quest_broken_on.isoformat() if p.quest_broken_on else None},
        "can_start_quest": can_start_quest(p),
        "next": {"emoji": nx.emoji, "name": nx.name, "needed": nx.min - p.level} if nx else None,
    }


def _member_or_404(db: Session, member_id: str) -> Member:
    m = db.get(Member, member_id)
    if not m or not m.active:
        raise HTTPException(404, "Member not found")
    return m


@router.get("/today")
def today_info(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    t = today_for(cfg)
    i = scoring.day_index(t)
    count, dhikr = scoring.bonus_parts(i)
    return {
        "today": t.isoformat(), "day_number": i + 1, "weekend": scoring.is_weekend(t), "week": week_info(t, cfg.score_from),
        "bonus": {"count": count, "dhikr": dhikr},
        "rules": {"cut_misses": cfg.cut_misses, "score_from": cfg.score_from.isoformat(), "timezone": cfg.timezone},
        "tiers": [tier_dict(x) for x in TIERS],
        "task_count": len(load_tasks(db)),
        "avatars": AVATARS,
        "viewer": {"kind": v.kind, "id": v.id, "name": v.name, "is_admin": v.is_admin,
                   "theme": (db.get(Member, v.id).theme if v.kind == "member" else "") or "bronze"},
        "gems": {"per_task": GEMS_PER_TASK, "full_day": GEMS_FOR_FULL_DAY, "per_level": GEMS_PER_LEVEL, "per_rank": RANK_GEMS},
    }


def _week_lates(db: Session, member_id: str, d: date) -> dict[date, dict]:
    start = week_start(d)
    logs = logs_between(db, start, start + timedelta(days=6), member_id)
    return {day: dict(l.late or {}) for (_, day), l in logs.items()}


def _prev_ticks(db: Session, member_id: str, d: date) -> list:
    prev = db.scalar(select(DayLog).where(DayLog.member_id == member_id, DayLog.day == d - timedelta(days=1)))
    return list(prev.tasks) if prev else []


def _day_view(db: Session, member: Member, d: date, v: Viewer) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [member], today)[member.id]
    tier = tier_of_progress(p)
    log = db.scalar(select(DayLog).where(DayLog.member_id == member.id, DayLog.day == d))
    done = set(log.tasks if log else [])
    late = dict(log.late or {}) if log else {}
    excuse = log.excuse if log else ""
    i = scoring.day_index(d)
    groups: dict[str, list] = {}
    specs = load_tasks(db)
    first = member_start(cfg, member)
    counted = scoring.credited(done, _prev_ticks(db, member.id, d), specs, first_day=d == first)
    for t in specs:
        item = {"key": t.key, "label": t.label_on(d), "done": t.key in done, "fitness": t.fitness, "late": t.key in late}
        if t.next_day:  # ticked tonight for tomorrow; today got last night's
            item |= {"next_day": True, "counted_today": t.key in counted}
        groups.setdefault(t.group, []).append(item)
    count, dhikr = scoring.bonus_parts(i)
    s = scoring.score_day(d, counted, excuse, today, cfg.cut_misses, specs)
    own = v.is_admin or v.id == member.id
    left = remaining(tier, d, today, _week_lates(db, member.id, d)) if d < today else 0
    if v.is_admin:
        mode = "admin" if d <= today else "locked"
    elif not own or d > today:
        mode = "locked"
    elif d == today:
        mode = "open"
    else:
        mode = "makeup" if (left > 0 or late) else "locked"
    return {
        "member": {"id": member.id, "name": member.name},
        "date": d.isoformat(), "today": today.isoformat(), "weekend": scoring.is_weekend(d),
        "pledge": None if scoring.is_weekend(d) else
        {"key": "gate", "label": scoring.task_label("gate", i), "done": "gate" in done, "late": False},
        "groups": [{"name": g, "tasks": ts} for g, ts in groups.items()],
        "bonus": {"key": "bonus", "count": count, "dhikr": dhikr, "done": "bonus" in done},
        "excuse": excuse,
        "score": _score_out(s),
        "mode": mode,
        "editable": mode != "locked",
        "excuse_editable": mode in ("admin", "open"),
        "makeup_left": left,
        "makeup_rule": tier.benefits,
        "before_scoring": d < first,
        "status": _status(p),
    }


@router.get("/day")
def get_day(member_id: str, day: date | None = Query(default=None, alias="date"),
            v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = _member_or_404(db, member_id)
    return _day_view(db, m, day or today_for(get_settings_row(db)), v)


@router.put("/day")
def save_day(body: DayUpdate, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = _member_or_404(db, body.member_id)
    cfg = get_settings_row(db)
    today = today_for(cfg)
    if not v.is_admin and v.id != m.id:
        raise HTTPException(403, "You can only mark your own tasks")
    if body.date > today:
        raise HTTPException(403, "That day has not started yet")
    specs = load_tasks(db)
    tasks = {k for k in body.tasks if k in {"gate", "bonus"} | {t.key for t in specs}}
    log = db.scalar(select(DayLog).where(DayLog.member_id == m.id, DayLog.day == body.date))
    before = set(log.tasks if log else [])
    late = dict(log.late or {}) if log else {}
    excuse = body.excuse.strip()

    if not v.is_admin and body.date < today:
        # Making up a finished day: only within the rank's allowance.
        added, removed = tasks - before, before - tasks
        if removed - set(late):
            raise HTTPException(403, "Tasks ticked on the day cannot be changed afterwards")
        if "bonus" in added:
            raise HTTPException(403, "The bonus cannot be made up: it counts only on its own day")
        if excuse != (log.excuse if log else ""):
            raise HTTPException(403, "An excuse can only be written on the day. Ask a parent")
        for k in removed:
            late.pop(k, None)
        for k in added - {"gate"}:
            late[k] = today.isoformat()
        week = _week_lates(db, m.id, body.date)
        week[body.date] = late
        tier = tier_of_progress(progress_for(db, cfg, [m], today)[m.id])
        problem = check_week(tier, week)
        if problem and added - {"gate"}:
            raise HTTPException(403, problem)
    elif v.is_admin:
        late = {k: d for k, d in late.items() if k in tasks}

    counted = scoring.credited(tasks, _prev_ticks(db, m.id, body.date), specs, first_day=body.date == member_start(cfg, m))
    if "bonus" in tasks and not scoring.score_day(body.date, counted, body.excuse, today, cfg.cut_misses, specs).gain:
        tasks.discard("bonus")  # the bonus opens only once every task is done (and unticks if one is unticked)
    if log is None:
        log = DayLog(member_id=m.id, day=body.date)
        db.add(log)
    log.tasks = sorted(tasks)
    log.late = late
    log.excuse = excuse
    log.updated_by = f"{v.kind}:{v.name}"
    db.commit()
    return _day_view(db, m, body.date, v)


@router.get("/leaderboard")
def leaderboard(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    members = active_members(db)
    prog = progress_for(db, cfg, members, today)
    yesterday = today - timedelta(days=1)
    logs = logs_between(db, yesterday, today)
    specs = load_tasks(db)
    rows = []
    for m in members:
        p = prog[m.id]
        log, prev = logs.get((m.id, today)), logs.get((m.id, yesterday))
        counted = scoring.credited(log.tasks if log else None, prev.tasks if prev else None, specs,
                                   first_day=today == member_start(cfg, m))
        s = scoring.score_day(today, counted, log.excuse if log else None, today, cfg.cut_misses, specs)
        rows.append({"member": {"id": m.id, "name": m.name, "avatar": m.avatar, "frame": m.frame},
                     **_status(p), "today": _score_out(s), "week_delta": p.week_delta,
                     "is_me": v.kind == "member" and v.id == m.id})
    rows.sort(key=lambda r: (-(10**6 if r["legendary"] else 0) - r["level"], r["member"]["name"].lower()))
    rank, prev = 0, None
    for i, r in enumerate(rows):
        key = (r["legendary"], r["level"])
        if key != prev:
            rank, prev = i + 1, key
        r["rank"] = rank
    weekly = sorted(rows, key=lambda r: (-r["week_delta"], -r["level"], r["member"]["name"].lower()))
    return {"week": week_info(today, cfg.score_from), "rows": rows,
            "weekly": [{"member_id": r["member"]["id"], "week_delta": r["week_delta"]} for r in weekly]}


@router.get("/history")
def history(days: int = Query(default=14, ge=1, le=62), v: Viewer = Depends(current_viewer),
            db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    start = today - timedelta(days=days - 1)
    members = active_members(db)
    prog = progress_for(db, cfg, members, today)
    logs = logs_between(db, start - timedelta(days=1), today)
    dates = list(scoring.date_range(start, today))
    specs = load_tasks(db)
    rows = []
    for m in members:
        cells = []
        first = member_start(cfg, m)
        for d in dates:
            if d < first:
                cells.append({"state": "pre"})
                continue
            log, prev = logs.get((m.id, d)), logs.get((m.id, d - timedelta(days=1)))
            counted = scoring.credited(log.tasks if log else None, prev.tasks if prev else None, specs, first_day=d == first)
            s = scoring.score_day(d, counted, log.excuse if log else None, today, cfg.cut_misses, specs)
            delta = prog[m.id].history.get(d, s.delta)
            state = "open" if d == today else "pos" if delta > 0 else "neg" if delta < 0 else \
                "rest" if s.weekend else "excused" if s.excused else "zero"
            cells.append({"state": state, "delta": delta, "done": s.done, "of": s.of})
        rows.append({"member": {"id": m.id, "name": m.name}, "cells": cells})
    return {"dates": [{"date": d.isoformat(), "weekend": scoring.is_weekend(d)} for d in dates], "rows": rows}


@router.put("/avatar")
def set_avatar(body: AvatarIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Parents set avatars in Admin")
    if body.avatar and body.avatar not in AVATARS:
        raise HTTPException(400, "Choose one of the avatars shown")
    m = db.get(Member, v.id)
    m.avatar = body.avatar
    db.commit()
    return {"avatar": m.avatar}


_RANK_ORDER = [t.key for t in TIERS]


def _celebration(db: Session, m: Member, tier, p) -> dict | None:
    """The rank-up show still owed to this member, if any.

    The first time we see a member we just note their rank (no show for where they started). A drop in rank is
    noted silently too, so climbing back up earns the show again."""
    now = _RANK_ORDER.index(tier.key)
    if m.seen_rank not in _RANK_ORDER or now < _RANK_ORDER.index(m.seen_rank):
        m.seen_rank, m.seen_level_gems = tier.key, p.gems_levels
        db.commit()
        return None
    if m.seen_rank == tier.key:
        return None
    return {"tier": tier.key, "reward": max(0, p.gems_levels - m.seen_level_gems)}


def _week_days(db: Session, cfg, m: Member, today: date) -> list[dict]:
    """This week, Sunday to Saturday: which days were completed."""
    start = week_start(today)
    first = member_start(cfg, m)
    specs = load_tasks(db)
    logs = logs_between(db, start - timedelta(days=1), start + timedelta(days=6), m.id)
    out = []
    for i in range(7):
        d = start + timedelta(days=i)
        log, prev = logs.get((m.id, d)), logs.get((m.id, d - timedelta(days=1)))
        if d > today or d < first:
            state = "future" if d > today else "pre"
        else:
            counted = scoring.credited(log.tasks if log else None, prev.tasks if prev else None, specs, first_day=d == first)
            sc = scoring.score_day(d, counted, log.excuse if log else None, today, cfg.cut_misses, specs)
            state = "done" if sc.gain else "open" if d == today else "rest" if sc.weekend else "excused" if sc.excused else "missed"
        out.append({"date": d.isoformat(), "state": state, "today": d == today})
    return out


def _profile(db: Session, m: Member) -> dict:
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    tier = tier_of_progress(p)
    celebrate = _celebration(db, m, tier, p)
    owned = owned_items(db, m.id)
    spent = gems_spent(db, m.id)
    claimed = gems_claimed(db, m.id)
    today = today_for(cfg)
    daily_gems = DAILY_CLAIM.get(tier.key, 0)
    claimed_today = claimed_on(db, m.id, today)
    nxt = p.best_level + 1
    reward = 0 if p.legendary or nxt > CAP_WITHOUT_LEGENDARY else GEMS_PER_LEVEL + (
        RANK_GEMS[tier_for(nxt, False).key] if tier_for(nxt, False).min == nxt else 0)
    return {"member": {"id": m.id, "name": m.name, "avatar": m.avatar, "frame": m.frame, "theme": m.theme or "bronze"},
            **_status(p), "week_delta": p.week_delta, "streak": p.streak,
            "gems": {"balance": gems_earned(p) + claimed - spent, "earned": gems_earned(p) + claimed, "spent": spent,
                     "claimed": claimed,
                     "today": p.today_tasks_gems, "from_tasks": p.gems_tasks, "from_levels": p.gems_levels},
            "next_level_reward": {"level": roman(nxt), "gems": reward} if reward else None,
            "frames": catalogue("frame", tier, owned), "themes": catalogue("theme", tier, owned),
            "avatars": catalogue("avatar", tier, owned), "celebrate": celebrate,
            "daily": {"gems": daily_gems, "claimed_today": claimed_today,
                      "available": daily_gems > 0 and p.streak > 0 and not claimed_today},
            "week_days": _week_days(db, cfg, m, today)}


@router.get("/profile")
def get_profile(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    return _profile(db, db.get(Member, v.id))


@router.post("/profile/celebrated")
def celebrated(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The member watched their rank-up show: don't play it again."""
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    m.seen_rank, m.seen_level_gems = tier_of_progress(p).key, p.gems_levels
    db.commit()
    return _profile(db, m)


@router.put("/profile")
def save_profile(body: ProfileIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """A member picks their picture, frame and theme from what their rank unlocked or they bought."""
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    tier = tier_of_progress(progress_for(db, cfg, [m], today_for(cfg))[m.id])
    owned = owned_items(db, m.id)
    for kind, value, keys in (("avatar", body.avatar, None), ("frame", body.frame, FRAME_KEYS), ("theme", body.theme, THEME_KEYS)):
        if value is None or value == "":
            if value == "":
                setattr(m, kind, "")
            continue
        if kind == "avatar" and value not in AVATARS and price_of("avatar", value) is None:
            raise HTTPException(400, "Choose one of the pictures shown")
        if keys is not None and value not in keys:
            raise HTTPException(400, f"Choose one of the {kind}s shown")
        if not item_available(kind, value, tier, owned):
            raise HTTPException(403, "Unlock it first: climb to its rank or buy it in the shop")
        setattr(m, kind, value)
    db.commit()
    return _profile(db, m)


@router.post("/shop/buy")
def buy(body: BuyIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Spend gems on a frame, theme or picture from the shop."""
    if v.kind != "member":
        raise HTTPException(400, "The shop is for members")
    m = db.get(Member, v.id)
    price = price_of(body.kind, body.key)
    if price is None:
        raise HTTPException(400, "That item is not sold in the shop")
    if shop_key(body.kind, body.key) in owned_items(db, m.id):
        raise HTTPException(400, "You already have it")
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    balance = gems_earned(p) + gems_claimed(db, m.id) - gems_spent(db, m.id)
    if balance < price:
        raise HTTPException(400, f"You need {price - balance} more gems. Finish tasks to earn more!")
    db.add(Purchase(member_id=m.id, item=shop_key(body.kind, body.key), price=price))
    setattr(m, body.kind, body.key)  # put it on straight away
    db.commit()
    return _profile(db, m)


@router.post("/claim")
def claim_daily(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Open the daily streak chest: once a day while the streak is alive; higher ranks get more gems."""
    if v.kind != "member":
        raise HTTPException(400, "The daily chest is for members")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [m], today)[m.id]
    gems = DAILY_CLAIM.get(tier_of_progress(p).key, 0)
    if claimed_on(db, m.id, today):
        raise HTTPException(400, "Already claimed today. Come back tomorrow!")
    if p.streak <= 0 or gems <= 0:
        raise HTTPException(400, "Finish all of today's tasks to light your streak, then claim")
    db.add(DailyClaim(member_id=m.id, day=today, gems=gems))
    db.commit()
    return _profile(db, m)


@router.post("/quest")
def start_quest(body: QuestIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Give up 🔮 Obsidian and restart at I on the road to 👑 Legendary."""
    m = _member_or_404(db, body.member_id)
    if not v.is_admin and v.id != m.id:
        raise HTTPException(403, "Only you or a parent can start your quest")
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [m], today)[m.id]
    if not can_start_quest(p):
        raise HTTPException(400, "Only an 🔮 Obsidian member can start the Legendary quest")
    m.quest_starts = [*(m.quest_starts or []), today.isoformat()]
    db.commit()
    return _status(progress_for(db, cfg, [m], today)[m.id])
