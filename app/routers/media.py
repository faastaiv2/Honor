"""Media the parent uploads, like the music for the Legendary quest film.

The file lives in the family's own database and is only served to signed-in family members."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Media

router = APIRouter(prefix="/media", tags=["media"])

# Every sound slot on the Animations page (Admin). Music plays through a whole film; the others play once.
KEYS = {
    "quest-music",   # Legendary quest film: music
    "quest-thunder", # Legendary quest film: the lightning strikes
    "quest-crack",   # Legendary quest film: the crest shatters
    "rankup-music",  # rank-up film: music
    "chest",         # a treasure chest is tapped open
    "gems",          # gems rain onto the heap (day complete)
    "gems-crack",    # the floor cracks under the heap
    "collect",       # gems fly into the wallet
    "achievement",   # an achievement is collected
    "event-win",     # winning a place in an art tournament
} | {f"rankup-music-{r}" for r in ("bronze", "silver", "gold", "platinum", "emerald", "sapphire", "ruby", "diamond",
                                   "obsidian", "legendary")}  # music for one rank's show (else the general rank-up music)
MAX_BYTES = 4_300_000  # the host accepts uploads up to about 4.5 MB
AUDIO = {"audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac", "audio/mp4", "audio/x-m4a", "audio/webm"}


def _key(key: str) -> str:
    if key not in KEYS:
        raise HTTPException(404, "Unknown media")
    return key


def _info(m: Media | None) -> dict:
    if not m:
        return {"has": False, "start": 0, "end": 0, "offset_ms": 0, "volume": 80, "size": 0, "updated": None}
    return {"has": True, "start": m.start, "end": m.end or 0, "offset_ms": m.offset_ms or 0, "volume": m.volume, "size": len(m.data),
            "updated": m.updated_at.isoformat()}


@router.get("")
def all_info(_: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Which sound slots have a file, and their settings (without the files themselves)."""
    # Read only the small columns: the files can be several megabytes each.
    rows = db.execute(select(Media.key, Media.start, Media.end, Media.offset_ms, Media.volume, Media.updated_at,
                             func.length(Media.data))).all()
    have = {k: {"has": True, "start": st, "end": en or 0, "offset_ms": off or 0, "volume": vol, "size": int(size or 0),
                "updated": up.isoformat()} for k, st, en, off, vol, up, size in rows}
    return {k: have.get(k, _info(None)) for k in sorted(KEYS)}


@router.get("/{key}/info")
def info(key: str, _: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    return _info(db.get(Media, _key(key)))


@router.get("/{key}")
def file(key: str, _: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> Response:
    m = db.get(Media, _key(key))
    if not m:
        raise HTTPException(404, "No file yet")
    return Response(m.data, media_type=m.mime, headers={"Cache-Control": "private, max-age=86400"})


@router.put("/{key}")
async def upload(key: str, request: Request, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """The raw file is the request body (not JSON), so a 4 MB song fits under the host's limit."""
    key = _key(key)
    mime = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    if mime not in AUDIO:
        raise HTTPException(400, "Choose a music file (MP3, M4A, OGG or WAV)")
    data = await request.body()
    if not data:
        raise HTTPException(400, "The file is empty")
    if len(data) > MAX_BYTES:
        raise HTTPException(400, f"That file is {len(data) / 1_000_000:.1f} MB. The most is 4.3 MB")
    m = db.get(Media, key) or Media(key=key, start=0, end=0, offset_ms=0, volume=80)
    m.mime, m.data, m.updated_at = mime, data, datetime.now(timezone.utc)
    db.add(m)
    db.commit()
    return _info(m)


class MediaSettings(BaseModel):
    start: int = Field(ge=0, le=3600)
    end: int = Field(default=0, ge=0, le=3600)  # 0 = play to the end of the file
    offset_ms: int = Field(default=0, ge=-15_000, le=120_000)  # when in the animation, from its usual moment
    volume: int = Field(ge=0, le=100)


@router.patch("/{key}")
def settings(key: str, body: MediaSettings, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Media, _key(key))
    if not m:
        raise HTTPException(404, "Upload the music first")
    if body.end and body.end <= body.start:
        raise HTTPException(400, "The end must be after the start")
    m.start, m.end, m.volume, m.offset_ms = body.start, body.end, body.volume, body.offset_ms
    db.commit()
    return _info(m)


@router.delete("/{key}")
def remove(key: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Media, _key(key))
    if m:
        db.delete(m)
        db.commit()
    return _info(None)
