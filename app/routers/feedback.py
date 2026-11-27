"""The Help button: members send a feature request or a bug report; only the admin sees them."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackIn(BaseModel):
    kind: str = Field(pattern="^(feature|bug)$")
    text: str = Field(min_length=3, max_length=2000)
    page: str = Field(default="", max_length=80)


def _out(f: Feedback) -> dict:
    return {"id": f.id, "kind": f.kind, "text": f.text, "page": f.page, "name": f.name, "read": f.read, "done": f.done, "reply": f.reply or "", "link": f.link or "",
            "created_at": f.created_at.isoformat()}


@router.post("", status_code=201)
def send(body: FeedbackIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    f = Feedback(member_id=v.id if v.kind == "member" else None, name=v.name, kind=body.kind, text=body.text.strip(),
                 page=body.page.strip())
    db.add(f)
    db.commit()
    return {"ok": True}


@router.get("")
def inbox(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    items = db.scalars(select(Feedback).order_by(Feedback.created_at.desc())).all()
    return {"items": [_out(f) for f in items], "unread": sum(1 for f in items if not f.read)}


@router.get("/unread")
def unread(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    return {"unread": db.scalar(select(func.count()).select_from(Feedback).where(Feedback.read.is_(False))) or 0}


@router.post("/read")
def mark_all_read(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    for f in db.scalars(select(Feedback).where(Feedback.read.is_(False))):
        f.read = True
    db.commit()
    return {"ok": True}


class FeedbackEdit(BaseModel):
    done: bool
    reply: str | None = Field(default=None, max_length=500)
    link: str | None = Field(default=None, pattern=r"^(|/|/leaderboard|/achievements|/news|/events|/profile|/benefits)$")


@router.patch("/{fid}")
def mark(fid: str, body: FeedbackEdit, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    f = db.get(Feedback, fid)
    if not f:
        raise HTTPException(404, "Not found")
    was = f.done
    f.done, f.read = body.done, True
    changed = (body.reply is not None and body.reply.strip() != (f.reply or "")) or (body.link is not None and body.link != (f.link or ""))
    if body.link is not None:
        f.link = body.link
    if body.reply is not None:
        f.reply = body.reply.strip()
    if body.done and (not was or changed) and f.member_id:
        f.done_seen = False  # the member gets a "added because of you!" pop-up
    if not body.done:
        f.done_seen = True
    db.commit()
    return _out(f)


@router.delete("/{fid}")
def remove(fid: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    f = db.get(Feedback, fid)
    if f:
        db.delete(f)
        db.commit()
    return {"ok": True}


def resolved_for(db: Session, member_id: str) -> list[dict]:
    """This member's requests the admin resolved that they haven't seen yet."""
    rows = db.scalars(select(Feedback).where(Feedback.member_id == member_id, Feedback.done.is_(True),
                                             Feedback.done_seen.is_(False)).order_by(Feedback.created_at))
    return [{"id": f.id, "kind": f.kind, "text": f.text, "reply": f.reply or "", "link": f.link or ""} for f in rows]


@router.post("/{fid}/seen")
def seen(fid: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    f = db.get(Feedback, fid)
    if f and v.kind == "member" and f.member_id == v.id:
        f.done_seen = True
        db.commit()
    return {"ok": True}
