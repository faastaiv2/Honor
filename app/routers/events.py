"""Events: art tournaments. The admin creates one for a day (usually Saturday) with a theme; that day members
send a picture of their art; the admin picks 1st, 2nd and 3rd, who get 100, 50 and 25 gems."""
import base64
import binascii
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Event, EventEntry, Member
from app.services import get_settings_row, today_for

router = APIRouter(prefix="/events", tags=["events"])

PRIZES = {1: 100, 2: 50, 3: 25}
SATURDAY = 5  # date.weekday()
MAX_BYTES = 1_500_000
MIMES = {"image/jpeg", "image/png", "image/webp"}


def next_saturday(d: date) -> date:
    return d + timedelta(days=(SATURDAY - d.weekday()) % 7)


def _entry_out(e: EventEntry, names: dict[str, str], avatars: dict[str, str]) -> dict:
    return {"id": e.id, "member": {"id": e.member_id, "name": names.get(e.member_id, "?"), "avatar": avatars.get(e.member_id, "")},
            "title": e.title, "place": e.place, "gems": e.gems, "day": e.event_day.isoformat()}


def _event_out(ev: Event) -> dict:
    return {"id": ev.id, "day": ev.day.isoformat(), "title": ev.title, "prompt": ev.prompt}


@router.get("")
def events(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    today = today_for(get_settings_row(db))
    evs = list(db.scalars(select(Event).order_by(Event.day)))
    upcoming = [e for e in evs if e.day >= today]
    now = next((e for e in upcoming if e.day == today), None)
    members = list(db.scalars(select(Member)))
    names = {m.id: m.name for m in members}
    avatars = {m.id: m.avatar for m in members}
    entries = list(db.scalars(select(EventEntry).where(EventEntry.event_day <= today).order_by(EventEntry.created_at)))
    by_day: dict[date, list[dict]] = {}
    for e in entries:
        by_day.setdefault(e.event_day, []).append(_entry_out(e, names, avatars))
    past = [e for e in reversed(evs) if e.day < today]
    return {
        "today": today.isoformat(), "open": now is not None, "prizes": PRIZES,
        "event": _event_out(now) if now else None,
        "next": _event_out(upcoming[0]) if upcoming and not now else (_event_out(upcoming[1]) if len(upcoming) > 1 else None),
        "upcoming": [_event_out(e) for e in upcoming],
        "suggested_day": next_saturday(today + timedelta(days=1) if now else today).isoformat(),
        "current": by_day.get(today, []) if now else [],
        "mine": next((x for x in by_day.get(today, []) if x["member"]["id"] == v.id), None) if now else None,
        "past": [{**_event_out(e), "judged": any(x["place"] for x in by_day.get(e.day, [])), "entries": by_day.get(e.day, [])}
                 for e in past][:8],
    }


class EventIn(BaseModel):
    day: date
    title: str = Field(default="Art Tournament", min_length=1, max_length=80)
    prompt: str = Field(default="", max_length=200)


@router.post("/create")
def create_event(body: EventIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    if body.day < today_for(get_settings_row(db)):
        raise HTTPException(400, "Choose today or a day in the future")
    if db.scalar(select(Event).where(Event.day == body.day)):
        raise HTTPException(400, "There is already an event that day")
    db.add(Event(day=body.day, title=body.title.strip(), prompt=body.prompt.strip()))
    db.commit()
    return events(v, db)


@router.delete("/{event_id}")
def delete_event(event_id: str, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    ev = db.get(Event, event_id)
    if ev:
        if db.scalar(select(EventEntry).where(EventEntry.event_day == ev.day)):
            raise HTTPException(400, "This event already has art in it, so it can't be deleted")
        db.delete(ev)
        db.commit()
    return events(v, db)


class EntryIn(BaseModel):
    title: str = Field(default="", max_length=80)
    image: str = Field(max_length=2_200_000)  # a data URL: data:image/jpeg;base64,...


@router.post("/entry")
def submit(body: EntryIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Only members take part")
    today = today_for(get_settings_row(db))
    if not db.scalar(select(Event).where(Event.day == today)):
        raise HTTPException(403, "There's no tournament open today")
    head, _, data = body.image.partition(",")
    mime = head.removeprefix("data:").removesuffix(";base64")
    if mime not in MIMES or not data:
        raise HTTPException(400, "Send a photo (JPEG, PNG or WebP)")
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "That picture could not be read")
    if len(raw) > MAX_BYTES:
        raise HTTPException(400, "That picture is too big")
    e = db.scalar(select(EventEntry).where(EventEntry.event_day == today, EventEntry.member_id == v.id))
    if e is None:
        e = EventEntry(event_day=today, member_id=v.id, gems=0)
        db.add(e)
    if e.place:
        raise HTTPException(400, "The winners are already chosen")
    e.title, e.mime, e.image = body.title.strip(), mime, raw
    db.commit()
    return events(v, db)


@router.delete("/entry/mine")
def withdraw(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    today = today_for(get_settings_row(db))
    e = db.scalar(select(EventEntry).where(EventEntry.event_day == today, EventEntry.member_id == v.id))
    if e and not e.place:
        db.delete(e)
        db.commit()
    return events(v, db)


@router.get("/image/{entry_id}")
def image(entry_id: str, _: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> Response:
    e = db.get(EventEntry, entry_id)
    if not e:
        raise HTTPException(404, "No such picture")
    return Response(e.image, media_type=e.mime, headers={"Cache-Control": "private, max-age=86400"})


class JudgeIn(BaseModel):
    day: date
    first: str | None = None
    second: str | None = None
    third: str | None = None


@router.post("/judge")
def judge(body: JudgeIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """The admin picks 1st, 2nd and 3rd (on the day or later). Picking again moves the prizes."""
    today = today_for(get_settings_row(db))
    if body.day > today:
        raise HTTPException(400, "That tournament hasn't happened yet")
    entries = list(db.scalars(select(EventEntry).where(EventEntry.event_day == body.day)))
    picks = {1: body.first, 2: body.second, 3: body.third}
    chosen = [x for x in picks.values() if x]
    if len(chosen) != len(set(chosen)):
        raise HTTPException(400, "Choose a different picture for each place")
    ids = {e.id for e in entries}
    if any(x not in ids for x in chosen):
        raise HTTPException(400, "Choose pictures from this tournament")
    for e in entries:
        place = next((p for p, x in picks.items() if x == e.id), None)
        if place != e.place:
            e.win_seen = False
        e.place, e.gems = place, PRIZES.get(place, 0) if place else 0
    db.commit()
    return events(v, db)


def unseen_win(db: Session, member_id: str) -> dict | None:
    """A prize the member hasn't celebrated yet."""
    e = db.scalar(select(EventEntry).where(EventEntry.member_id == member_id, EventEntry.place.is_not(None),
                                           EventEntry.win_seen.is_(False)).order_by(EventEntry.event_day.desc()))
    return {"id": e.id, "place": e.place, "gems": e.gems, "day": e.event_day.isoformat(), "title": e.title} if e else None


def placings(db: Session, member_id: str) -> dict[int, int]:
    """How many times the member came 1st, 2nd and 3rd."""
    out = {1: 0, 2: 0, 3: 0}
    for (place,) in db.execute(select(EventEntry.place).where(EventEntry.member_id == member_id, EventEntry.place.is_not(None))):
        out[place] = out.get(place, 0) + 1
    return out


@router.post("/seen/{entry_id}")
def seen(entry_id: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    e = db.get(EventEntry, entry_id)
    if e and e.member_id == v.id:
        e.win_seen = True
        db.commit()
    return {"ok": True}
