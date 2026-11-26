"""Announcements: news the parents post for the whole family."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Announcement, Member

router = APIRouter(prefix="/news", tags=["news"])


class NewsIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=4000)
    emoji: str = Field(default="📣", max_length=8)
    pinned: bool = False


class NewsPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=4000)
    emoji: str | None = Field(default=None, max_length=8)
    pinned: bool | None = None


def _aware(t: datetime | None) -> datetime | None:
    return t.replace(tzinfo=timezone.utc) if t and t.tzinfo is None else t


def _out(a: Announcement, seen: datetime | None) -> dict:
    created = _aware(a.created_at)
    return {"id": a.id, "title": a.title, "body": a.body, "emoji": a.emoji or "📣", "pinned": a.pinned,
            "author": a.author, "created_at": created.isoformat(), "new": seen is None or created > seen}


@router.get("")
def list_news(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    seen = None
    if not v.is_admin:
        m = db.get(Member, v.id)
        seen = _aware(m.news_seen_at) if m else None
    rows = db.scalars(select(Announcement).order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
                      .limit(100)).all()
    items = [_out(a, seen) for a in rows]
    if v.is_admin:
        for i in items:
            i["new"] = False
    return {"items": items, "unread": sum(1 for i in items if i["new"])}


@router.post("/seen")
def mark_seen(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if not v.is_admin and (m := db.get(Member, v.id)):
        m.news_seen_at = datetime.now(timezone.utc)
        db.commit()
    return {"unread": 0}


@router.post("", status_code=201)
def create_news(body: NewsIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    a = Announcement(title=body.title.strip(), body=body.body.strip(), emoji=body.emoji.strip() or "📣",
                     pinned=body.pinned, author=v.name, created_at=datetime.now(timezone.utc))
    db.add(a)
    db.commit()
    return _out(a, None)


@router.patch("/{news_id}")
def edit_news(news_id: str, body: NewsPatch, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    a = db.get(Announcement, news_id)
    if not a:
        raise HTTPException(404, "No such announcement")
    for k, val in body.model_dump(exclude_none=True).items():
        setattr(a, k, val.strip() if isinstance(val, str) else val)
    db.commit()
    return _out(a, None)


@router.delete("/{news_id}", status_code=204)
def delete_news(news_id: str, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    a = db.get(Announcement, news_id)
    if not a:
        raise HTTPException(404, "No such announcement")
    db.delete(a)
    db.commit()
