import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from zoneinfo import available_timezones

from app.db import get_db
from app.deps import Viewer, require_admin
from app.models import Adjustment, DayLog, Member, Period, TaskDef
from app.scoring import DEFAULT_SPECS, TaskSpec
from app.security import hash_secret
from app.services import get_settings_row, today_for
from app.tiers import tier_for
from app.sheet_import import parse_sheet

router = APIRouter(prefix="/admin", tags=["admin"])

PIN = Field(default=None, pattern=r"^\d{4,8}$")


class MemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    code: str | None = Field(default=None, min_length=1, max_length=3, pattern=r"^[A-Za-z]+$")  # made from the name
    base_honor: int = Field(default=1, ge=-1000, le=1000)
    pin: str | None = PIN


class MemberPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    code: str | None = Field(default=None, min_length=1, max_length=3, pattern=r"^[A-Za-z]+$")
    base_honor: int | None = Field(default=None, ge=-1000, le=1000)
    pin: str | None = PIN
    sort_order: int | None = None
    active: bool | None = None
    avatar: str | None = Field(default=None, max_length=16)


class AdjustmentIn(BaseModel):
    member_id: str
    delta: int = Field(ge=-100, le=100)
    note: str = Field(default="", max_length=200)

    @field_validator("delta")
    @classmethod
    def _nonzero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("Change must not be zero")
        return v


class SettingsIn(BaseModel):
    score_from: date | None = None
    cut_misses: int | None = Field(default=None, ge=1, le=17)
    timezone: str | None = None


class ImportIn(BaseModel):
    text: str = Field(max_length=2_000_000)
    start: date
    end: date
    # Which member each letter in the sheet means, e.g. {"S": "<member id>"}. Letters left out are skipped.
    mapping: dict[str, str] = Field(default_factory=dict)


class PreviewIn(BaseModel):
    text: str = Field(max_length=2_000_000)


def _make_code(name: str, taken: set[str]) -> str:
    """A short internal tag for a member (never shown); unique, letters only."""
    letters = "".join(ch for ch in name if ch.isascii() and ch.isalpha()) or "M"
    for n in (1, 2, 3):
        c = letters[:n].capitalize()
        if c.lower() not in taken:
            return c
    i = 0
    while True:
        c = (letters[0].upper() + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i % 26] + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i // 26 % 26])
        if c.lower() not in taken:
            return c
        i += 1


def _member_out(m: Member) -> dict:
    return {"id": m.id, "name": m.name, "code": m.code, "base_honor": m.base_honor, "has_pin": bool(m.pin_hash),
            "sort_order": m.sort_order, "active": m.active, "avatar": m.avatar, "early_ticks": m.early_ticks or 0}


@router.get("/members")
def list_members(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return [_member_out(m) for m in db.scalars(select(Member).order_by(Member.sort_order, Member.name))]


@router.post("/members", status_code=201)
def add_member(body: MemberIn, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    last = db.scalar(select(func.max(Member.sort_order))) or 0
    taken = {c.lower() for c in db.scalars(select(Member.code))}
    code = body.code.strip() if body.code else _make_code(body.name.strip(), taken)
    m = Member(name=body.name.strip(), code=code, base_honor=body.base_honor, sort_order=last + 1,
               pin_hash=hash_secret(body.pin) if body.pin else None,
               seen_rank=tier_for(body.base_honor, False).key)  # climbs from here on get their rank-up show
    db.add(m)
    db.commit()
    return _member_out(m)


@router.patch("/members/{member_id}")
def edit_member(member_id: str, body: MemberPatch, _: Viewer = Depends(require_admin),
                db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    data = body.model_dump(exclude_unset=True)
    if "pin" in data:
        pin = data.pop("pin")
        m.pin_hash = hash_secret(pin) if pin else None
    for k, val in data.items():
        if val is not None:
            setattr(m, k, val.strip() if isinstance(val, str) else val)
    db.commit()
    return _member_out(m)


@router.delete("/members/{member_id}", status_code=204)
def delete_member(member_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    m = db.get(Member, member_id)
    if m:
        for model in (DayLog, Adjustment):
            for row in db.scalars(select(model).where(model.member_id == member_id)):
                db.delete(row)
        db.delete(m)
        db.commit()


@router.get("/adjustments")
def list_adjustments(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Adjustment).order_by(Adjustment.created_at.desc()).limit(100))
    return [{"id": a.id, "member_id": a.member_id, "delta": a.delta, "note": a.note,
             "created_at": a.created_at.isoformat(), "created_by": a.created_by} for a in rows]


@router.post("/adjustments", status_code=201)
def add_adjustment(body: AdjustmentIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    if not db.get(Member, body.member_id):
        raise HTTPException(404, "Member not found")
    a = Adjustment(member_id=body.member_id, delta=body.delta, note=body.note.strip(), created_by=v.name)
    db.add(a)
    db.commit()
    return {"id": a.id}


@router.delete("/adjustments/{adj_id}", status_code=204)
def delete_adjustment(adj_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    a = db.get(Adjustment, adj_id)
    if a:
        db.delete(a)
        db.commit()


@router.get("/settings")
def read_settings(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    s = get_settings_row(db)
    return {"score_from": s.score_from.isoformat(), "cut_misses": s.cut_misses, "timezone": s.timezone}


@router.put("/settings")
def write_settings(body: SettingsIn, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    s = get_settings_row(db)
    if body.timezone is not None:
        if body.timezone not in available_timezones():
            raise HTTPException(400, "Unknown time zone. Use a name like Asia/Riyadh or Europe/London")
        s.timezone = body.timezone
    if body.score_from is not None:
        s.score_from = body.score_from
    if body.cut_misses is not None:
        s.cut_misses = body.cut_misses
    db.commit()
    return {"score_from": s.score_from.isoformat(), "cut_misses": s.cut_misses, "timezone": s.timezone}


@router.post("/import")
def import_sheet(body: ImportIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """Copy ticks from the pasted sheet into the app for days between start and end (inclusive)."""
    if body.end < body.start:
        raise HTTPException(400, "The end date is before the start date")
    members = {m.id: m for m in db.scalars(select(Member))}
    if body.mapping:
        by_code = {k.strip().lower(): members[v] for k, v in body.mapping.items() if v in members}
    else:
        by_code = {m.code.strip().lower(): m for m in members.values()}
    unknown: set[str] = set()
    written = 0
    days = [p for p in parse_sheet(body.text) if body.start <= p.day <= body.end]
    for p in days:
        for who in set(p.ticks) | p.excused:
            m = by_code.get(who.lower())
            if not m:
                unknown.add(who)
                continue
            log = db.scalar(select(DayLog).where(DayLog.member_id == m.id, DayLog.day == p.day))
            if log is None:
                log = DayLog(member_id=m.id, day=p.day)
                db.add(log)
            log.tasks = sorted(p.ticks.get(who, set()))
            log.excuse = "Excused (from sheet)" if who in p.excused else ""
            log.updated_by = f"import:{v.name}"
            written += 1
    db.commit()
    return {"days": len(days), "entries": written, "unknown_initials": sorted(unknown)}


@router.post("/import/preview")
def preview_sheet(body: PreviewIn, _: Viewer = Depends(require_admin)) -> dict:
    """The letters used in the pasted sheet and its date range, so the admin can say who is who."""
    days = parse_sheet(body.text)
    letters = sorted({w for d in days for w in (*d.ticks, *d.excused)}, key=lambda x: (x.lower(), x))
    return {"days": len(days), "first": min((d.day for d in days), default=None),
            "last": max((d.day for d in days), default=None), "letters": letters}


# ------------------------------------------------------------------ daily tasks
class TaskIn(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    group: str = Field(default="Tasks", min_length=1, max_length=40)
    fitness: bool = False
    number_today: int | None = Field(default=None, ge=0, le=1_000_000)
    step: int = Field(default=0, ge=-1000, le=1000)
    every: int = Field(default=1, ge=1, le=365)
    next_day: bool = False
    not_before: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class TaskPatch(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    group: str | None = Field(default=None, min_length=1, max_length=40)
    fitness: bool | None = None
    number_today: int | None = Field(default=None, ge=0, le=1_000_000)
    clear_number: bool = False
    step: int | None = Field(default=None, ge=-1000, le=1000)
    every: int | None = Field(default=None, ge=1, le=365)
    move: int | None = Field(default=None, ge=-1, le=1)  # -1 up, +1 down
    next_day: bool | None = None
    not_before: str | None = Field(default=None, pattern=r"^(([01]\d|2[0-3]):[0-5]\d)?$")  # "" clears it


def _task_out(t: TaskDef, today: date) -> dict:
    spec = TaskSpec(t.key, t.label, t.group, t.fitness, t.number, t.step, t.every, t.start_day)
    return {"key": t.key, "label": t.label, "group": t.group, "fitness": t.fitness, "next_day": bool(t.next_day),
            "not_before": t.not_before or None,
            "number_today": spec.number_on(today),
            "step": t.step, "every": t.every, "shown_today": spec.label_on(today),
            "shown_tomorrow": spec.label_on(today + timedelta(days=1))}


def _ensure_tasks(db: Session) -> list[TaskDef]:
    rows = list(db.scalars(select(TaskDef).order_by(TaskDef.sort_order, TaskDef.key)))
    if not rows:  # a board made before tasks were editable: store the sheet's tasks first
        for i, t in enumerate(DEFAULT_SPECS):
            db.add(TaskDef(key=t.key, label=t.label, group=t.group, fitness=t.fitness, number=t.number, step=t.step,
                           every=t.every, start_day=t.start_day, next_day=t.next_day, not_before=t.not_before, sort_order=i))
        db.commit()
        rows = list(db.scalars(select(TaskDef).order_by(TaskDef.sort_order, TaskDef.key)))
    return rows


def _label_with_number(label: str, has_number: bool) -> str:
    label = label.strip()
    if has_number and "{n}" not in label:
        label = "{n} " + label
    return label


@router.get("/tasks")
def list_tasks(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    today = today_for(get_settings_row(db))
    return [_task_out(t, today) for t in _ensure_tasks(db)]


@router.post("/tasks", status_code=201)
def add_task(body: TaskIn, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    rows = _ensure_tasks(db)
    today = today_for(get_settings_row(db))
    base = re.sub(r"[^a-z0-9]+", "", body.label.replace("{n}", "").lower())[:16] or "task"
    key, i = base, 2
    taken = {r.key for r in rows} | {"gate", "bonus"}
    while key in taken:
        key, i = f"{base[:14]}{i}", i + 1
    t = TaskDef(key=key, label=_label_with_number(body.label, body.number_today is not None), group=body.group.strip(),
                fitness=body.fitness, number=body.number_today, step=body.step, every=body.every, start_day=today,
                next_day=body.next_day, not_before=body.not_before,
                sort_order=max((r.sort_order for r in rows), default=0) + 1)
    db.add(t)
    db.commit()
    return _task_out(t, today)


@router.patch("/tasks/{key}")
def edit_task(key: str, body: TaskPatch, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    rows = _ensure_tasks(db)
    t = next((r for r in rows if r.key == key), None)
    if not t:
        raise HTTPException(404, "Task not found")
    today = today_for(get_settings_row(db))
    if body.move:
        i = rows.index(t)
        j = i + body.move
        if 0 <= j < len(rows):
            rows[i], rows[j] = rows[j], rows[i]
            for n, r in enumerate(rows):
                r.sort_order = n
    if body.clear_number:
        t.number, t.step = None, 0
        t.label = t.label.replace("{n}", "").strip()
    if body.number_today is not None or body.step is not None or body.every is not None:
        # Keep today's number unless a new one is given, and count the increase from today.
        spec = TaskSpec(t.key, t.label, t.group, t.fitness, t.number, t.step, t.every, t.start_day)
        current = spec.number_on(today)
        t.number = body.number_today if body.number_today is not None else (current if current is not None else 0)
        t.start_day = today
        if body.step is not None:
            t.step = body.step
        if body.every is not None:
            t.every = body.every
    if body.label is not None:
        t.label = body.label.strip()
    if t.number is not None:
        t.label = _label_with_number(t.label, True)
    if body.group is not None:
        t.group = body.group.strip()
    if body.fitness is not None:
        t.fitness = body.fitness
    if body.next_day is not None:
        t.next_day = body.next_day
    if body.not_before is not None:
        t.not_before = body.not_before or None
    db.commit()
    return _task_out(t, today)


@router.delete("/tasks/{key}", status_code=204)
def delete_task(key: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    rows = _ensure_tasks(db)
    t = next((r for r in rows if r.key == key), None)
    if t:
        if len(rows) <= 1:
            raise HTTPException(400, "Keep at least one task")
        db.delete(t)
        db.commit()


@router.post("/tasks/reset")
def reset_tasks(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    """Put the tasks back exactly as in the original sheet (names, groups, order, growing numbers).
    Tasks added later are removed; members' past ticks are kept."""
    for r in db.scalars(select(TaskDef)):
        db.delete(r)
    db.flush()
    for i, t in enumerate(DEFAULT_SPECS):
        db.add(TaskDef(key=t.key, label=t.label, group=t.group, fitness=t.fitness, number=t.number, step=t.step,
                       every=t.every, start_day=t.start_day, next_day=t.next_day, not_before=t.not_before, sort_order=i))
    db.commit()
    today = today_for(get_settings_row(db))
    return [_task_out(r, today) for r in db.scalars(select(TaskDef).order_by(TaskDef.sort_order))]


# ---------------------------------------------------------------- special periods (like Ramadan)
class PeriodIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    start: date
    end: date
    off: list[str] = Field(default_factory=list, max_length=60)  # tasks paused during the period
    numbers: dict[str, int] = Field(default_factory=dict)  # task -> smaller fixed number during the period
    members: list[str] = Field(default_factory=list, max_length=60)  # who it applies to; empty = everyone

    @field_validator("numbers")
    @classmethod
    def _numbers_ok(cls, v: dict[str, int]) -> dict[str, int]:
        if any(n < 0 or n > 1_000_000 for n in v.values()):
            raise ValueError("Numbers must be between 0 and 1,000,000")
        return v


def _period_out(p: Period) -> dict:
    return {"id": p.id, "name": p.name, "start": p.start.isoformat(), "end": p.end.isoformat(),
            "off": list(p.off or []), "numbers": dict(p.numbers or {}),
            "members": list(p.members or [])}


def _check_period(body: PeriodIn, db: Session) -> None:
    if body.end < body.start:
        raise HTTPException(400, "The last day must be on or after the first day")
    if (body.end - body.start).days > 120:
        raise HTTPException(400, "A period can be at most 120 days")
    keys = {r.key for r in _ensure_tasks(db)}
    unknown = (set(body.off) | set(body.numbers)) - keys
    if unknown:
        raise HTTPException(400, f"Unknown task: {', '.join(sorted(unknown))}")
    ids = set(db.scalars(select(Member.id)))
    if set(body.members) - ids:
        raise HTTPException(400, "Unknown member")
    if not body.off and not body.numbers:
        raise HTTPException(400, "Pause at least one task or give one a smaller number")


@router.get("/periods")
def list_periods(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return [_period_out(p) for p in db.scalars(select(Period).order_by(Period.start))]


@router.post("/periods", status_code=201)
def add_period(body: PeriodIn, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    _check_period(body, db)
    p = Period(name=body.name.strip(), start=body.start, end=body.end, off=sorted(set(body.off) - set(body.numbers)),
               numbers=body.numbers, members=sorted(set(body.members)))
    db.add(p)
    db.commit()
    return _period_out(p)


@router.put("/periods/{period_id}")
def edit_period(period_id: str, body: PeriodIn, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    p = db.get(Period, period_id)
    if not p:
        raise HTTPException(404, "Period not found")
    _check_period(body, db)
    p.name, p.start, p.end = body.name.strip(), body.start, body.end
    p.off, p.numbers = sorted(set(body.off) - set(body.numbers)), body.numbers
    p.members = sorted(set(body.members))
    db.commit()
    return _period_out(p)


@router.delete("/periods/{period_id}", status_code=204)
def delete_period(period_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    p = db.get(Period, period_id)
    if p:
        db.delete(p)
        db.commit()
