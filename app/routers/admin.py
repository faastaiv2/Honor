from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from zoneinfo import available_timezones

from app.db import get_db
from app.deps import Viewer, require_admin
from app.models import Adjustment, DayLog, Member
from app.security import hash_secret
from app.services import get_settings_row
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
            "sort_order": m.sort_order, "active": m.active, "avatar": m.avatar}


@router.get("/members")
def list_members(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return [_member_out(m) for m in db.scalars(select(Member).order_by(Member.sort_order, Member.name))]


@router.post("/members", status_code=201)
def add_member(body: MemberIn, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    last = db.scalar(select(func.max(Member.sort_order))) or 0
    taken = {c.lower() for c in db.scalars(select(Member.code))}
    code = body.code.strip() if body.code else _make_code(body.name.strip(), taken)
    m = Member(name=body.name.strip(), code=code, base_honor=body.base_honor, sort_order=last + 1,
               pin_hash=hash_secret(body.pin) if body.pin else None)
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
