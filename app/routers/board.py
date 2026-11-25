from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.deps import Viewer, current_viewer
from app.makeup import check_week, remaining, week_start
from app.models import DayLog, Member
from app.progress import Progress
from app.services import (active_members, can_start_quest, get_settings_row, logs_between, member_start,
                          progress_for, tier_of_progress, today_for, week_info)
from app.tiers import TIERS, next_tier, roman, tier_dict

router = APIRouter(prefix="/board", tags=["board"])

AVATARS = ["🦁", "🐯", "🦅", "🐺", "🐎", "🦊", "🐪", "🐆", "🦉", "🐬", "🐢", "🐘", "⚔️", "🛡️", "🏹", "🌙", "⭐", "🔥", "⚽", "🏏"]


class DayUpdate(BaseModel):
    member_id: str
    date: date
    tasks: list[str] = Field(default_factory=list, max_length=40)
    excuse: str = Field(default="", max_length=120)


class AvatarIn(BaseModel):
    avatar: str = Field(max_length=16)


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
        "avatars": AVATARS,
        "viewer": {"kind": v.kind, "id": v.id, "name": v.name, "is_admin": v.is_admin},
    }


def _week_lates(db: Session, member_id: str, d: date) -> dict[date, dict]:
    start = week_start(d)
    logs = logs_between(db, start, start + timedelta(days=6), member_id)
    return {day: dict(l.late or {}) for (_, day), l in logs.items()}


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
    for t in scoring.TASKS:
        groups.setdefault(t.group, []).append({"key": t.key, "label": scoring.task_label(t.key, i), "done": t.key in done,
                                               "fitness": t.fitness, "late": t.key in late})
    count, dhikr = scoring.bonus_parts(i)
    s = scoring.score_day(d, done, excuse, today, cfg.cut_misses)
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
        "before_scoring": d < member_start(cfg, member),
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
    tasks = {k for k in body.tasks if k in scoring.ALL_KEYS}
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
    logs = logs_between(db, today, today)
    rows = []
    for m in members:
        p = prog[m.id]
        log = logs.get((m.id, today))
        s = scoring.score_day(today, log.tasks if log else None, log.excuse if log else None, today, cfg.cut_misses)
        rows.append({"member": {"id": m.id, "name": m.name, "code": m.code, "avatar": m.avatar},
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
    logs = logs_between(db, start, today)
    dates = list(scoring.date_range(start, today))
    rows = []
    for m in members:
        cells = []
        first = member_start(cfg, m)
        for d in dates:
            if d < first:
                cells.append({"state": "pre"})
                continue
            log = logs.get((m.id, d))
            s = scoring.score_day(d, log.tasks if log else None, log.excuse if log else None, today, cfg.cut_misses)
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


@router.post("/quest")
def start_quest(body: QuestIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Give up 💎 Diamond Honor and restart at I on the road to 👑 Legendary Honor."""
    m = _member_or_404(db, body.member_id)
    if not v.is_admin and v.id != m.id:
        raise HTTPException(403, "Only you or a parent can start your quest")
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [m], today)[m.id]
    if not can_start_quest(p):
        raise HTTPException(400, "Only a 💎 Diamond Honor member can start the Legendary quest")
    m.quest_starts = [*(m.quest_starts or []), today.isoformat()]
    db.commit()
    return _status(progress_for(db, cfg, [m], today)[m.id])
