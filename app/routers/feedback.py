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
    return {"id": f.id, "kind": f.kind, "text": f.text, "page": f.page, "name": f.name, "read": f.read, "done": f.done,
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


@router.patch("/{fid}")
def mark(fid: str, body: FeedbackEdit, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    f = db.get(Feedback, fid)
    if not f:
        raise HTTPException(404, "Not found")
    f.done, f.read = body.done, True
    db.commit()
    return _out(f)


@router.delete("/{fid}")
def remove(fid: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    f = db.get(Feedback, fid)
    if f:
        db.delete(f)
        db.commit()
    return {"ok": True}
