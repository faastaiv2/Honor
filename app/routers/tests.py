"""Tests the admin sends to members. First one: Deploy Shaytan.

Shaytan appears to the member (clouds, then him) and offers gems to skip the day's tasks. Saying yes gets nothing:
he laughs and vanishes, because his promises are empty. Afterwards the admin can cut Honor (the member sees why),
post it to Community, or reward a member who refused (the member sees why)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Adjustment, GemGrant, Member, Temptation

router = APIRouter(prefix="/tests", tags=["tests"])


def ladder(offer: int) -> list[int]:
    """Each "no" brings him back with more: the admin's offer, then 100, then 500 (always bigger)."""
    second = max(100, offer * 2) if offer >= 100 else 100
    return [offer, second, max(500, second * 5) if offer >= 100 else 500]


def _out(t: Temptation, m: Member | None) -> dict:
    return {"id": t.id, "member": {"id": t.member_id, "name": m.name if m else "?", "avatar": m.avatar if m else ""},
            "offer": t.offer, "answer": t.answer, "answered_at": t.answered_at.isoformat() if t.answered_at else None,
            "auto_cut": t.auto_cut, "refusals": t.refusals, "final_offer": t.final_offer, "ladder": ladder(t.offer),
            "cut": t.cut, "reward": t.reward, "posted": t.posted, "created_at": t.created_at.isoformat()}


def _get(db: Session, test_id: str) -> Temptation:
    t = db.get(Temptation, test_id)
    if not t:
        raise HTTPException(404, "No such test")
    return t


class DeployIn(BaseModel):
    member_id: str
    offer: int = Field(default=50, ge=1, le=1000)
    cut: int = Field(default=1, ge=0, le=20)  # Honor cut straight away if they say yes (0 = decide later)


@router.get("")
def list_tests(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    members = {m.id: m for m in db.scalars(select(Member))}
    rows = db.scalars(select(Temptation).order_by(Temptation.created_at.desc()).limit(100))
    return [_out(t, members.get(t.member_id)) for t in rows]


@router.post("/shaytan", status_code=201)
def deploy(body: DeployIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, body.member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    if db.scalar(select(Temptation.id).where(Temptation.member_id == m.id, Temptation.answer == "")):
        raise HTTPException(400, f"Shaytan is already waiting for {m.name}")
    t = Temptation(member_id=m.id, offer=body.offer, auto_cut=body.cut, created_by=v.name)
    db.add(t)
    db.commit()
    return _out(t, m)


@router.delete("/{test_id}", status_code=204)
def cancel(test_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    t = _get(db, test_id)
    db.delete(t)
    db.commit()


class CutIn(BaseModel):
    levels: int = Field(ge=1, le=20)


@router.post("/{test_id}/cut")
def cut(test_id: str, body: CutIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    t = _get(db, test_id)
    if t.answer != "yes":
        raise HTTPException(400, "Only after a deal with Shaytan")
    db.add(Adjustment(member_id=t.member_id, delta=-body.levels, note="Made a deal with Shaytan", created_by=v.name))
    t.cut, t.cut_seen = t.cut + body.levels, False
    db.commit()
    return _out(t, db.get(Member, t.member_id))


class RewardIn(BaseModel):
    gems: int = Field(ge=1, le=10000)


@router.post("/{test_id}/reward")
def reward(test_id: str, body: RewardIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    t = _get(db, test_id)
    if t.answer != "no":
        raise HTTPException(400, "Only for refusing Shaytan")
    db.add(GemGrant(member_id=t.member_id, delta=body.gems, note="Refused Shaytan", created_by=v.name))
    t.reward, t.reward_seen = t.reward + body.gems, False
    db.commit()
    return _out(t, db.get(Member, t.member_id))


@router.post("/{test_id}/post")
def post(test_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    t = _get(db, test_id)
    if t.answer != "yes":
        raise HTTPException(400, "Only after a deal with Shaytan")
    if t.posted:
        raise HTTPException(400, "Already posted")
    m = db.get(Member, t.member_id)
    from app.routers.news import system_post
    system_post(db, "shaytan", m, f"{m.name} worked with Shaytan 😈", {"offer": t.final_offer or t.offer}, emoji="😈",
                body=f"Shaytan offered {t.final_offer or t.offer} gems to skip the day's tasks, and {m.name} said yes.")
    t.posted = True
    db.commit()
    return _out(t, m)


# ---------------------------------------------------------------- the member's side
def for_member(db: Session, member_id: str) -> dict | None:
    """What the member still has to see: Shaytan waiting, or a cut / reward that came after."""
    waiting = db.scalar(select(Temptation).where(Temptation.member_id == member_id, Temptation.answer == "")
                        .order_by(Temptation.created_at).limit(1))
    if waiting:
        return {"id": waiting.id, "show": "offer", "offer": waiting.offer, "ladder": ladder(waiting.offer)}
    t = db.scalar(select(Temptation).where(Temptation.member_id == member_id,
                                           (Temptation.cut_seen.is_(False)) | (Temptation.reward_seen.is_(False)))
                  .order_by(Temptation.created_at).limit(1))
    if t and not t.cut_seen:
        return {"id": t.id, "show": "cut", "levels": t.cut}
    if t and not t.reward_seen:
        return {"id": t.id, "show": "reward", "gems": t.reward}
    return None


class AnswerIn(BaseModel):
    accept: bool
    refusals: int = Field(default=0, ge=0, le=3)  # offers turned down before this answer


@router.post("/{test_id}/answer")
def answer(test_id: str, body: AnswerIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    t = _get(db, test_id)
    if v.kind != "member" or v.id != t.member_id:
        raise HTTPException(403, "Not your test")
    if t.answer:
        raise HTTPException(400, "Already answered")
    steps = ladder(t.offer)
    if body.accept:
        t.refusals = min(body.refusals, 2)
        t.final_offer = steps[t.refusals]
    else:
        t.refusals, t.final_offer = 3, steps[-1]
    t.answer, t.answered_at = ("yes" if body.accept else "no"), datetime.now(timezone.utc)
    if body.accept and t.auto_cut > 0:  # the deal costs Honor at once; they see why next
        db.add(Adjustment(member_id=t.member_id, delta=-t.auto_cut, note="Made a deal with Shaytan", created_by="Honor"))
        t.cut, t.cut_seen = t.cut + t.auto_cut, False
    db.commit()
    return {"answer": t.answer}


class SeenIn(BaseModel):
    what: str = Field(pattern=r"^(cut|reward)$")


@router.post("/{test_id}/seen")
def seen(test_id: str, body: SeenIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    t = _get(db, test_id)
    if v.kind != "member" or v.id != t.member_id:
        raise HTTPException(403, "Not your test")
    if body.what == "cut":
        t.cut_seen = True
    else:
        t.reward_seen = True
    db.commit()
    return {"ok": True}
