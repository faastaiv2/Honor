"""🤝 Friends quest. The admin puts members in pairs (a trio when the number is odd). Each pair reads the dhikr
together and enters their count as a sealed bid: nobody sees another pair's number. When the admin closes the quest,
the counts are revealed: the biggest takes 1st prize, the next 2nd, and so on; each friend in a pair gets the gems."""
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import FriendQuest, FriendTeam, GemGrant, Member
from app.services import active_members

router = APIRouter(prefix="/friends", tags=["friends"])


def _aware(d: datetime | None) -> datetime | None:
    return d.replace(tzinfo=timezone.utc) if d is not None and d.tzinfo is None else d


def _launched(q: FriendQuest) -> bool:
    o = _aware(q.opens_at)
    return o is not None and datetime.now(timezone.utc) >= o


def _is_open(q: FriendQuest) -> bool:
    c = _aware(q.closes_at)
    return not q.closed and _launched(q) and (c is None or datetime.now(timezone.utc) < c)


def _out(db: Session, q: FriendQuest, v: Viewer) -> dict:
    teams = list(db.scalars(select(FriendTeam).where(FriendTeam.quest_id == q.id)))
    people = {m.id: m for m in db.scalars(select(Member))}
    def who(t: FriendTeam) -> list[dict]:
        return [{"id": i, "name": people[i].name if i in people else "?", "avatar": people[i].avatar if i in people else ""}
                for i in t.members]
    mine = next((t for t in teams if v.kind == "member" and v.id in t.members), None)
    reveal = q.closed or v.is_admin
    out = {"id": q.id, "title": q.title, "dhikr": q.dhikr, "prizes": q.prizes, "closed": q.closed, "open": _is_open(q),
           "launched": _launched(q), "opens_at": _aware(q.opens_at).isoformat() if q.opens_at else None,
           "closes_at": _aware(q.closes_at).isoformat() if q.closes_at else None, "created_at": q.created_at.isoformat(),
           "entered": sum(1 for t in teams if t.count is not None), "teams_total": len(teams),
           "teams": [{"id": t.id, "members": who(t), "count": t.count if reveal else None, "entered": t.count is not None,
                      "place": t.place, "gems": t.gems, "mine": t is mine}
                     for t in sorted(teams, key=lambda t: (t.place or 99, -(t.count or 0)) if q.closed else (0, 0))]}
    if mine:
        out["mine"] = {"id": mine.id, "count": mine.count, "members": who(mine), "place": mine.place, "gems": mine.gems,
                       "entered_by": people[mine.entered_by].name if mine.entered_by in people else "",
                       "seen": v.id in (mine.seen_by or [])}
    return out


@router.get("")
def list_quests(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    qs = list(db.scalars(select(FriendQuest).order_by(FriendQuest.created_at.desc())))[:10]
    items = [_out(db, q, v) for q in qs]
    if v.kind == "member":
        items = [i for i in items if "mine" in i and i["launched"]]  # members only see it once the admin launches it
    return {"items": items}


class QuestIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    dhikr: str = Field(default="", max_length=160)
    prizes: list[int] = Field(min_length=1, max_length=10)
    opens_at: datetime | None = None  # when it launches: None = keep it ready, launch later by hand
    launch_now: bool = False
    closes_at: datetime | None = None
    teams: list[list[str]] | None = None  # pairs chosen by the admin; None = pair everyone at random


def _random_pairs(ids: list[str]) -> list[list[str]]:
    ids = ids[:]
    random.shuffle(ids)
    teams = [ids[i:i + 2] for i in range(0, len(ids) - len(ids) % 2, 2)]
    if len(ids) % 2:
        if teams:
            teams[-1].append(ids[-1])  # odd one out joins the last pair
        else:
            teams = [[ids[-1]]]
    return teams


@router.post("", status_code=201)
def create(body: QuestIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    if any(p < 0 or p > 100_000 for p in body.prizes):
        raise HTTPException(400, "Prizes must be 0 or more gems")
    ids = [m.id for m in active_members(db)]
    teams = body.teams if body.teams is not None else _random_pairs(ids)
    seen: set[str] = set()
    for t in teams:
        if not 1 <= len(t) <= 3 or any(i not in ids or i in seen for i in t):
            raise HTTPException(400, "Each member can be in one pair only (pairs of 2, or 3)")
        seen |= set(t)
    if len(teams) < 1:
        raise HTTPException(400, "Make at least one pair")
    utc = lambda d: d.astimezone(timezone.utc) if d is not None and d.tzinfo else d  # noqa: E731
    q = FriendQuest(title=body.title.strip(), dhikr=body.dhikr.strip(), prizes=body.prizes,
                    opens_at=datetime.now(timezone.utc) if body.launch_now else utc(body.opens_at), closes_at=utc(body.closes_at))
    db.add(q)
    db.flush()
    for t in teams:
        db.add(FriendTeam(quest_id=q.id, members=list(t), seen_by=[]))
    db.commit()
    return _out(db, q, v)


class BidIn(BaseModel):
    count: int = Field(ge=0, le=10_000_000)


@router.post("/{qid}/bid")
def bid(qid: str, body: BidIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    q = db.get(FriendQuest, qid)
    if not q:
        raise HTTPException(404, "No such quest")
    if not _is_open(q):
        raise HTTPException(400, "This Friends quest isn't open" if not _launched(q) else "This Friends quest is closed")
    team = next((t for t in db.scalars(select(FriendTeam).where(FriendTeam.quest_id == q.id)) if v.id in t.members), None)
    if not team:
        raise HTTPException(403, "You're not in a pair in this quest")
    team.count, team.entered_by, team.entered_at = body.count, v.id, datetime.now(timezone.utc)
    db.commit()
    return _out(db, q, v)


class LaunchIn(BaseModel):
    at: datetime | None = None  # None = right now


@router.post("/{qid}/launch")
def launch(qid: str, body: LaunchIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """Launch it now, or set (or change) the time it launches."""
    q = db.get(FriendQuest, qid)
    if not q:
        raise HTTPException(404, "No such quest")
    if q.closed:
        raise HTTPException(400, "Already closed")
    at = body.at.astimezone(timezone.utc) if body.at and body.at.tzinfo else body.at
    q.opens_at = at or datetime.now(timezone.utc)
    db.commit()
    return _out(db, q, v)


@router.post("/{qid}/close")
def close(qid: str, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """Open the sealed bids: places by count (equal counts share a place), prizes to each friend in the pair."""
    q = db.get(FriendQuest, qid)
    if not q:
        raise HTTPException(404, "No such quest")
    if q.closed:
        raise HTTPException(400, "Already closed")
    teams = [t for t in db.scalars(select(FriendTeam).where(FriendTeam.quest_id == q.id))]
    ranked = sorted([t for t in teams if t.count], key=lambda t: -(t.count or 0))
    place, prev = 0, None
    for i, t in enumerate(ranked):
        if t.count != prev:
            place, prev = i + 1, t.count
        t.place = place
        t.gems = q.prizes[place - 1] if place - 1 < len(q.prizes) else 0
        if t.gems:
            for mid in t.members:
                db.add(GemGrant(member_id=mid, delta=t.gems, note=f"🤝 Friends quest: {q.title} ({_ordinal(place)} place)",
                                created_by=v.name))
    q.closed = True
    db.commit()
    return _out(db, q, v)


def _ordinal(n: int) -> str:
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


@router.post("/{qid}/seen", status_code=204)
def seen(qid: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> None:
    for t in db.scalars(select(FriendTeam).where(FriendTeam.quest_id == qid)):
        if v.id in t.members and v.id not in (t.seen_by or []):
            t.seen_by = [*(t.seen_by or []), v.id]
    db.commit()


@router.delete("/{qid}")
def delete(qid: str, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    q = db.get(FriendQuest, qid)
    if q:
        if q.closed:
            raise HTTPException(400, "Its prizes are given; it stays in the record")
        for t in db.scalars(select(FriendTeam).where(FriendTeam.quest_id == q.id)):
            db.delete(t)
        db.delete(q)
        db.commit()
    return list_quests(v, db)
