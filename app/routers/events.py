"""Events: art tournaments. The admin sets one up for a day: opening and closing time, prizes for 1st, 2nd and
3rd, an entry fee in gems and a banner. While it's open members send a picture of their art; the admin picks
the winners, who get the prizes."""
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
from app.services import clock_for, gem_balance, get_settings_row, today_for

router = APIRouter(prefix="/events", tags=["events"])

SATURDAY = 5  # date.weekday()
MAX_BYTES = 1_500_000
MIMES = {"image/jpeg", "image/png", "image/webp"}
BANNERS = ["sunset", "ocean", "forest", "royal", "night", "rainbow"]
TIME = r"^([01]\d|2[0-3]):[0-5]\d$"


def next_saturday(d: date) -> date:
    return d + timedelta(days=(SATURDAY - d.weekday()) % 7)


def _picture(data_url: str) -> tuple[str, bytes]:
    head, _, data = data_url.partition(",")
    mime = head.removeprefix("data:").removesuffix(";base64")
    if mime not in MIMES or not data:
        raise HTTPException(400, "Send a photo (JPEG, PNG or WebP)")
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "That picture could not be read")
    if len(raw) > MAX_BYTES:
        raise HTTPException(400, "That picture is too big")
    return mime, raw


def _state(ev: Event, today: date, clock: str) -> str:
    if ev.day > today or (ev.day == today and clock < ev.opens):
        return "upcoming"
    if ev.day == today and clock < ev.closes:
        return "open"
    return "closed"


def _entry_out(e: EventEntry, names: dict[str, str], avatars: dict[str, str]) -> dict:
    return {"id": e.id, "member": {"id": e.member_id, "name": names.get(e.member_id, "?"), "avatar": avatars.get(e.member_id, "")},
            "title": e.title, "place": e.place, "gems": e.gems, "day": e.event_day.isoformat()}


def _event_out(ev: Event, today: date, clock: str) -> dict:
    return {"id": ev.id, "day": ev.day.isoformat(), "title": ev.title, "prompt": ev.prompt, "opens": ev.opens,
            "closes": ev.closes, "prizes": {"1": ev.prize1, "2": ev.prize2, "3": ev.prize3}, "fee": ev.fee,
            "banner": ev.banner, "banner_image": ev.banner == "custom" and ev.banner_image is not None,
            "state": _state(ev, today, clock)}


@router.get("")
def events(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    today, clock = today_for(cfg), clock_for(cfg)
    evs = list(db.scalars(select(Event).order_by(Event.day)))
    members = list(db.scalars(select(Member)))
    names = {m.id: m.name for m in members}
    avatars = {m.id: m.avatar for m in members}
    by_day: dict[date, list[dict]] = {}
    for e in db.scalars(select(EventEntry).order_by(EventEntry.created_at)):
        by_day.setdefault(e.event_day, []).append(_entry_out(e, names, avatars))
    now = next((e for e in evs if e.day == today), None)  # today's event, open or not
    upcoming = [e for e in evs if e.day > today or (e.day == today and _state(e, today, clock) != "closed")]
    past = [e for e in reversed(evs) if _state(e, today, clock) == "closed"]
    is_open = bool(now and _state(now, today, clock) == "open")
    out = lambda e: _event_out(e, today, clock)  # noqa: E731
    return {
        "today": today.isoformat(), "clock": clock, "open": is_open, "banners": BANNERS,
        "event": out(now) if now and _state(now, today, clock) != "closed" else None,
        "next": out(upcoming[0]) if upcoming else None,
        "upcoming": [out(e) for e in upcoming],
        "suggested_day": next_saturday(today if not now else today + timedelta(days=1)).isoformat(),
        "current": by_day.get(today, []) if now and is_open else [],
        "mine": next((x for x in by_day.get(today, []) if x["member"]["id"] == v.id), None) if is_open else None,
        "past": [{**out(e), "judged": any(x["place"] for x in by_day.get(e.day, [])), "entries": by_day.get(e.day, [])}
                 for e in past][:8],
    }


class EventIn(BaseModel):
    day: date
    title: str = Field(default="Saturday Art Tournament", min_length=1, max_length=80)
    prompt: str = Field(default="", max_length=200)
    opens: str = Field(default="00:00", pattern=TIME)
    closes: str = Field(default="23:59", pattern=TIME)
    prize1: int = Field(default=100, ge=0, le=10_000)
    prize2: int = Field(default=50, ge=0, le=10_000)
    prize3: int = Field(default=25, ge=0, le=10_000)
    fee: int = Field(default=0, ge=0, le=5_000)
    banner: str = Field(default="sunset", max_length=16)
    banner_image: str | None = Field(default=None, max_length=2_200_000)  # a data URL when banner is "custom"


def _apply(ev: Event, body: EventIn) -> None:
    if body.closes <= body.opens:
        raise HTTPException(400, "It must close after it opens")
    if body.banner not in [*BANNERS, "custom"]:
        raise HTTPException(400, "Choose one of the banners")
    ev.day, ev.title, ev.prompt = body.day, body.title.strip(), body.prompt.strip()
    ev.opens, ev.closes, ev.fee = body.opens, body.closes, body.fee
    ev.prize1, ev.prize2, ev.prize3 = body.prize1, body.prize2, body.prize3
    ev.banner = body.banner
    if body.banner == "custom" and body.banner_image:
        ev.banner_mime, ev.banner_image = _picture(body.banner_image)
    if body.banner == "custom" and not ev.banner_image:
        raise HTTPException(400, "Upload a banner picture or choose a ready-made one")


@router.post("/create")
def create_event(body: EventIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    if body.day < today_for(get_settings_row(db)):
        raise HTTPException(400, "Choose today or a day in the future")
    if db.scalar(select(Event).where(Event.day == body.day)):
        raise HTTPException(400, "There is already an event that day")
    ev = Event()
    _apply(ev, body)
    db.add(ev)
    db.commit()
    return events(v, db)


@router.put("/{event_id}")
def edit_event(event_id: str, body: EventIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    has_art = db.scalar(select(EventEntry).where(EventEntry.event_day == ev.day)) is not None
    if body.day != ev.day:
        if has_art:
            raise HTTPException(400, "Art has already been sent in, so the day can't change")
        if db.scalar(select(Event).where(Event.day == body.day, Event.id != ev.id)):
            raise HTTPException(400, "There is already an event that day")
    _apply(ev, body)
    # New prizes apply to winners already picked.
    for e in db.scalars(select(EventEntry).where(EventEntry.event_day == ev.day, EventEntry.place.is_not(None))):
        e.gems = {1: ev.prize1, 2: ev.prize2, 3: ev.prize3}[e.place]
    db.commit()
    return events(v, db)


@router.delete("/{event_id}")
def delete_event(event_id: str, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """Delete an event. Its art goes too: entry fees are given back and prizes taken back."""
    ev = db.get(Event, event_id)
    if ev:
        for e in db.scalars(select(EventEntry).where(EventEntry.event_day == ev.day)):
            db.delete(e)
        db.delete(ev)
        db.commit()
    return events(v, db)


@router.get("/banner/{event_id}")
def banner(event_id: str, _: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> Response:
    ev = db.get(Event, event_id)
    if not ev or not ev.banner_image:
        raise HTTPException(404, "No banner")
    return Response(ev.banner_image, media_type=ev.banner_mime, headers={"Cache-Control": "private, max-age=86400"})


class EntryIn(BaseModel):
    title: str = Field(default="", max_length=80)
    image: str = Field(max_length=2_200_000)  # a data URL: data:image/jpeg;base64,...


@router.post("/entry")
def submit(body: EntryIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Only members take part")
    cfg = get_settings_row(db)
    today, clock = today_for(cfg), clock_for(cfg)
    ev = db.scalar(select(Event).where(Event.day == today))
    if not ev or _state(ev, today, clock) != "open":
        raise HTTPException(403, "The tournament isn't open right now")
    mime, raw = _picture(body.image)
    e = db.scalar(select(EventEntry).where(EventEntry.event_day == today, EventEntry.member_id == v.id))
    if e and e.place:
        raise HTTPException(400, "The winners are already chosen")
    if e is None:
        m = db.get(Member, v.id)
        if ev.fee and gem_balance(db, cfg, m) < ev.fee:
            raise HTTPException(400, f"Entering costs {ev.fee} gems. Finish your tasks to earn more!")
        e = EventEntry(event_day=today, member_id=v.id, gems=0, fee_paid=ev.fee)
        db.add(e)
    e.title, e.mime, e.image = body.title.strip(), mime, raw
    db.commit()
    return events(v, db)


@router.delete("/entry/mine")
def withdraw(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Take your art back out (the entry fee comes back) while the tournament is open."""
    cfg = get_settings_row(db)
    today, clock = today_for(cfg), clock_for(cfg)
    ev = db.scalar(select(Event).where(Event.day == today))
    e = db.scalar(select(EventEntry).where(EventEntry.event_day == today, EventEntry.member_id == v.id))
    if e and not e.place and ev and _state(ev, today, clock) == "open":
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
    """The admin picks 1st, 2nd and 3rd (once art is in). Picking again moves the prizes."""
    ev = db.scalar(select(Event).where(Event.day == body.day))
    if not ev:
        raise HTTPException(404, "No event that day")
    entries = list(db.scalars(select(EventEntry).where(EventEntry.event_day == body.day)))
    picks = {1: body.first, 2: body.second, 3: body.third}
    chosen = [x for x in picks.values() if x]
    if len(chosen) != len(set(chosen)):
        raise HTTPException(400, "Choose a different picture for each place")
    ids = {e.id for e in entries}
    if any(x not in ids for x in chosen):
        raise HTTPException(400, "Choose pictures from this tournament")
    prizes = {1: ev.prize1, 2: ev.prize2, 3: ev.prize3}
    for e in entries:
        place = next((p for p, x in picks.items() if x == e.id), None)
        if place != e.place:
            e.win_seen = False
        e.place, e.gems = place, prizes[place] if place else 0
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
