"""Polls and surveys: the admin asks the family a question with answers to choose from; members vote (and can
change their vote while the poll is open) and see the results after voting, if the admin allows it."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Member, Poll, PollVote

router = APIRouter(prefix="/polls", tags=["polls"])


def _out(p: Poll, votes: list[PollVote], v: Viewer, names: dict[str, str]) -> dict:
    mine = next((x.choices for x in votes if x.member_id == v.id), None) if v.kind == "member" else None
    counts = [sum(1 for x in votes if i in (x.choices or [])) for i in range(len(p.options))]
    see = v.is_admin or (p.show_results and (mine is not None or p.closed))
    out = {"id": p.id, "question": p.question, "options": p.options, "multi": p.multi, "anonymous": p.anonymous,
           "show_results": p.show_results, "closed": p.closed, "created_at": p.created_at.isoformat(),
           "mine": mine, "voters": len(votes), "counts": counts if see else None}
    if v.is_admin and not p.anonymous:
        out["who"] = [[names.get(x.member_id, "?") for x in votes if i in (x.choices or [])] for i in range(len(p.options))]
    return out


@router.get("")
def list_polls(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    polls = list(db.scalars(select(Poll).order_by(Poll.created_at.desc())))
    votes: dict[str, list[PollVote]] = {}
    for x in db.scalars(select(PollVote)):
        votes.setdefault(x.poll_id, []).append(x)
    names = {m.id: m.name for m in db.scalars(select(Member))}
    items = [_out(p, votes.get(p.id, []), v, names) for p in polls]
    waiting = sum(1 for i in items if not i["closed"] and i["mine"] is None) if v.kind == "member" else 0
    return {"items": items, "waiting": waiting}


class PollIn(BaseModel):
    question: str = Field(min_length=1, max_length=200)
    options: list[str] = Field(min_length=2, max_length=8)
    multi: bool = False
    anonymous: bool = False
    show_results: bool = True


@router.post("", status_code=201)
def create(body: PollIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    opts = [o.strip()[:100] for o in body.options if o.strip()]
    if len(opts) < 2:
        raise HTTPException(400, "Give at least two answers")
    p = Poll(question=body.question.strip(), options=opts, multi=body.multi, anonymous=body.anonymous,
             show_results=body.show_results, created_by=v.name)
    db.add(p)
    db.commit()
    return list_polls(v, db)


class VoteIn(BaseModel):
    choices: list[int] = Field(min_length=1, max_length=8)


@router.post("/{poll_id}/vote")
def vote(poll_id: str, body: VoteIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Only members vote")
    p = db.get(Poll, poll_id)
    if not p:
        raise HTTPException(404, "No such poll")
    if p.closed:
        raise HTTPException(400, "This poll is closed")
    picks = sorted(set(body.choices))
    if any(i < 0 or i >= len(p.options) for i in picks) or (not p.multi and len(picks) != 1):
        raise HTTPException(400, "Pick one answer" if not p.multi else "Pick from the answers")
    x = db.scalar(select(PollVote).where(PollVote.poll_id == p.id, PollVote.member_id == v.id))
    if x:
        x.choices = picks
    else:
        db.add(PollVote(poll_id=p.id, member_id=v.id, choices=picks))
    db.commit()
    return list_polls(v, db)


class PollPatch(BaseModel):
    closed: bool


@router.patch("/{poll_id}")
def close(poll_id: str, body: PollPatch, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    p = db.get(Poll, poll_id)
    if not p:
        raise HTTPException(404, "No such poll")
    p.closed = body.closed
    db.commit()
    return list_polls(v, db)


@router.delete("/{poll_id}")
def delete(poll_id: str, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    p = db.get(Poll, poll_id)
    if p:
        for x in db.scalars(select(PollVote).where(PollVote.poll_id == p.id)):
            db.delete(x)
        db.delete(p)
        db.commit()
    return list_polls(v, db)
