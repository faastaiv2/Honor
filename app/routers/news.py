"""Community: posts from the parents, and posts the app writes when something happens
(a member puts on a new picture, someone wins 1st place in a tournament). Everyone can ❤️ them."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Announcement, Member, PostLike

router = APIRouter(prefix="/news", tags=["news"])


def _who(v: Viewer) -> str:
    return f"{v.kind}:{v.id}"


def system_post(db: Session, kind: str, m: Member, title: str, data: dict, body: str = "",
                emoji: str = "✨", merge_minutes: int = 0, replace: dict | None = None) -> Announcement:
    """A post written by the app. With merge_minutes, a post of the same kind by the same member that recent is
    updated instead (no flood when someone tries on five pictures). With replace, older posts of this kind whose
    data match are removed first (a tournament re-judged: only the new winner stays)."""
    now = datetime.now(timezone.utc)
    if replace:
        for old in db.scalars(select(Announcement).where(Announcement.kind == kind)):
            if all((old.data or {}).get(k) == v for k, v in replace.items()):
                db.delete(old)
    if merge_minutes:
        recent = db.scalar(select(Announcement).where(Announcement.kind == kind, Announcement.member_id == m.id)
                           .order_by(Announcement.created_at.desc()).limit(1))
        if recent and _aware(recent.created_at) > now - timedelta(minutes=merge_minutes):
            recent.title, recent.body, recent.data, recent.created_at = title, body, data, now
            return recent
    a = Announcement(kind=kind, member_id=m.id, title=title[:120], body=body, emoji=emoji, data=data, author="Honor",
                     created_at=now)
    db.add(a)
    return a


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


def _out(a: Announcement, seen: datetime | None, likes: list[PostLike] | None = None, me: str = "",
         members: dict | None = None) -> dict:
    created = _aware(a.created_at)
    likes = likes or []
    m = (members or {}).get(a.member_id) if a.member_id else None
    return {"id": a.id, "kind": a.kind or "post", "title": a.title, "body": a.body, "emoji": a.emoji or "📣",
            "pinned": a.pinned, "author": a.author, "created_at": created.isoformat(), "new": seen is None or created > seen,
            "data": a.data or {},
            "member": {"id": m.id, "name": m.name, "avatar": m.avatar, "frame": m.frame} if m else None,
            "likes": len(likes), "liked": any(x.who == me for x in likes), "likers": [x.name for x in likes][:8]}


@router.get("")
def list_news(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    seen = None
    if not v.is_admin:
        m = db.get(Member, v.id)
        seen = _aware(m.news_seen_at) if m else None
    rows = db.scalars(select(Announcement).order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
                      .limit(100)).all()
    likes: dict[str, list[PostLike]] = {}
    for x in db.scalars(select(PostLike).where(PostLike.post_id.in_([a.id for a in rows])).order_by(PostLike.created_at)):
        likes.setdefault(x.post_id, []).append(x)
    members = {m.id: m for m in db.scalars(select(Member))}
    items = [_out(a, seen, likes.get(a.id), _who(v), members) for a in rows]
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


@router.post("/{news_id}/like")
def like(news_id: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """❤️ a post, or take the ❤️ back."""
    a = db.get(Announcement, news_id)
    if not a:
        raise HTTPException(404, "No such post")
    mine = db.scalar(select(PostLike).where(PostLike.post_id == a.id, PostLike.who == _who(v)))
    if mine:
        db.delete(mine)
    else:
        db.add(PostLike(post_id=a.id, who=_who(v), name=v.name))
    db.commit()
    rows = list(db.scalars(select(PostLike).where(PostLike.post_id == a.id).order_by(PostLike.created_at)))
    return {"likes": len(rows), "liked": not mine, "likers": [x.name for x in rows][:8]}


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
