from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.deps import Viewer, current_viewer
from app.models import DayLog, Member
from app.services import (active_members, can_edit_day, get_settings_row, honor_totals, logs_between,
                          tier_dict, today_for)

router = APIRouter(prefix="/board", tags=["board"])


class DayUpdate(BaseModel):
    member_id: str
    date: date
    tasks: list[str] = Field(default_factory=list, max_length=40)
    excuse: str = Field(default="", max_length=120)


def _score_out(s: scoring.DayScore) -> dict:
    return {"gain": s.gain, "bonus": s.bonus, "cut": s.cut, "delta": s.delta, "done": s.done, "of": s.of,
            "weekend": s.weekend, "excused": s.excused}


@router.get("/today")
def today_info(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    t = today_for(cfg)
    i = scoring.day_index(t)
    count, dhikr = scoring.bonus_parts(i)
    return {
        "today": t.isoformat(), "day_number": i + 1, "weekend": scoring.is_weekend(t),
        "bonus": {"count": count, "dhikr": dhikr},
        "rules": {"cut_misses": cfg.cut_misses, "score_from": cfg.score_from.isoformat(), "timezone": cfg.timezone},
        "tiers": [{"min": t_[0] if t_[0] > -10**8 else None, "emoji": t_[1], "name": t_[2], "color": t_[3]}
                  for t_ in reversed(scoring.TIERS)],
        "viewer": {"kind": v.kind, "id": v.id, "name": v.name, "is_admin": v.is_admin},
    }


def _day_view(db: Session, member: Member, d: date, v: Viewer) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    log = db.scalar(select(DayLog).where(DayLog.member_id == member.id, DayLog.day == d))
    done = set(log.tasks if log else [])
    excuse = log.excuse if log else ""
    i = scoring.day_index(d)
    weekend = scoring.is_weekend(d)
    groups: dict[str, list] = {}
    for t in scoring.TASKS:
        groups.setdefault(t.group, []).append(
            {"key": t.key, "label": scoring.task_label(t.key, i), "done": t.key in done, "fitness": t.fitness})
    count, dhikr = scoring.bonus_parts(i)
    s = scoring.score_day(d, done, excuse, today, cfg.cut_misses)
    return {
        "member": {"id": member.id, "name": member.name},
        "date": d.isoformat(), "today": today.isoformat(), "weekend": weekend,
        "pledge": None if weekend else {"key": "gate", "label": scoring.task_label("gate", i), "done": "gate" in done},
        "groups": [{"name": g, "tasks": ts} for g, ts in groups.items()],
        "bonus": {"key": "bonus", "count": count, "dhikr": dhikr, "done": "bonus" in done},
        "excuse": excuse,
        "score": _score_out(s),
        "editable": can_edit_day(v.is_admin, d, today) and (v.is_admin or v.id == member.id),
        "before_scoring": d < cfg.score_from,
    }


def _member_or_404(db: Session, member_id: str) -> Member:
    m = db.get(Member, member_id)
    if not m or not m.active:
        raise HTTPException(404, "Member not found")
    return m


@router.get("/day")
def get_day(member_id: str, day: date | None = Query(default=None, alias="date"),
            v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = _member_or_404(db, member_id)
    d = day or today_for(get_settings_row(db))
    return _day_view(db, m, d, v)


@router.put("/day")
def save_day(body: DayUpdate, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = _member_or_404(db, body.member_id)
    today = today_for(get_settings_row(db))
    if not v.is_admin and v.id != m.id:
        raise HTTPException(403, "You can only mark your own tasks")
    if not can_edit_day(v.is_admin, body.date, today):
        raise HTTPException(403, "This day is locked. Ask a parent to change it")
    tasks = sorted({k for k in body.tasks if k in scoring.ALL_KEYS})
    log = db.scalar(select(DayLog).where(DayLog.member_id == m.id, DayLog.day == body.date))
    if log is None:
        log = DayLog(member_id=m.id, day=body.date)
        db.add(log)
    log.tasks = tasks
    log.excuse = body.excuse.strip()
    log.updated_by = f"{v.kind}:{v.name}"
    db.commit()
    return _day_view(db, m, body.date, v)


@router.get("/leaderboard")
def leaderboard(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> list[dict]:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    members = active_members(db)
    totals = honor_totals(db, cfg, members, today)
    logs = logs_between(db, today, today)
    rows = []
    for m in members:
        h = totals[m.id]
        log = logs.get((m.id, today))
        s = scoring.score_day(today, log.tasks if log else None, log.excuse if log else None, today, cfg.cut_misses)
        rows.append({"member": {"id": m.id, "name": m.name, "code": m.code}, "honor": h, "level": scoring.roman(h),
                     "tier": tier_dict(h), "today": _score_out(s)})
    rows.sort(key=lambda r: (-r["honor"], r["member"]["name"].lower()))
    rank, prev = 0, None
    for i, r in enumerate(rows):
        if r["honor"] != prev:
            rank, prev = i + 1, r["honor"]
        r["rank"] = rank
    return rows


@router.get("/history")
def history(days: int = Query(default=14, ge=1, le=62), v: Viewer = Depends(current_viewer),
            db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    start = today - timedelta(days=days - 1)
    logs = logs_between(db, start, today)
    dates = list(scoring.date_range(start, today))
    rows = []
    for m in active_members(db):
        cells = []
        for d in dates:
            if d < cfg.score_from:
                cells.append({"state": "pre"})
                continue
            log = logs.get((m.id, d))
            s = scoring.score_day(d, log.tasks if log else None, log.excuse if log else None, today, cfg.cut_misses)
            state = "open" if d == today else "pos" if s.delta > 0 else "neg" if s.delta < 0 else \
                "rest" if s.weekend else "excused" if s.excused else "zero"
            cells.append({"state": state, "delta": s.delta, "done": s.done, "of": s.of})
        rows.append({"member": {"id": m.id, "name": m.name}, "cells": cells})
    return {"dates": [{"date": d.isoformat(), "weekend": scoring.is_weekend(d)} for d in dates], "rows": rows}
