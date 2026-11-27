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


# ---------------------------------------------------------------- the man in the cloak (sadaqah)
from app.models import CharityTest  # noqa: E402


def _charity_out(t: CharityTest, m: Member | None) -> dict:
    return {"id": t.id, "member": {"id": t.member_id, "name": m.name if m else "?", "avatar": m.avatar if m else ""},
            "ask": t.ask, "give_back": t.give_back, "answer": t.answer, "given": t.given,
            "answered_at": t.answered_at.isoformat() if t.answered_at else None, "created_at": t.created_at.isoformat()}


class CharityIn(BaseModel):
    member_id: str
    ask: int = Field(default=20, ge=1, le=1000)
    give_back: int = Field(default=50, ge=0, le=5000)


@router.get("/charity")
def list_charity(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    members = {m.id: m for m in db.scalars(select(Member))}
    rows = db.scalars(select(CharityTest).order_by(CharityTest.created_at.desc()).limit(100))
    return [_charity_out(t, members.get(t.member_id)) for t in rows]


@router.post("/charity", status_code=201)
def deploy_charity(body: CharityIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, body.member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    if db.scalar(select(CharityTest.id).where(CharityTest.member_id == m.id, CharityTest.answer == "")):
        raise HTTPException(400, f"The man in the cloak is already waiting for {m.name}")
    t = CharityTest(member_id=m.id, ask=body.ask, give_back=body.give_back, created_by=v.name)
    db.add(t)
    db.commit()
    return _charity_out(t, m)


@router.delete("/charity/{test_id}", status_code=204)
def cancel_charity(test_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    t = db.get(CharityTest, test_id)
    if t:
        db.delete(t)
        db.commit()


def charity_for(db: Session, member_id: str) -> dict | None:
    t = db.scalar(select(CharityTest).where(CharityTest.member_id == member_id, CharityTest.answer == "")
                  .order_by(CharityTest.created_at).limit(1))
    return {"id": t.id, "ask": t.ask} if t else None


class CharityAnswerIn(BaseModel):
    give: bool


@router.post("/charity/{test_id}/answer")
def answer_charity(test_id: str, body: CharityAnswerIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Give: the gems go (never more than they have), and he gives back give_back. Get lost: nothing changes,
    except that they find out who he really was."""
    from app.services import gem_balance, get_settings_row
    t = db.get(CharityTest, test_id)
    if not t:
        raise HTTPException(404, "No such test")
    if v.kind != "member" or v.id != t.member_id:
        raise HTTPException(403, "Not your test")
    if t.answer:
        raise HTTPException(400, "Already answered")
    t.answer, t.answered_at = ("give" if body.give else "refuse"), datetime.now(timezone.utc)
    if body.give:
        m = db.get(Member, t.member_id)
        t.given = max(0, min(t.ask, gem_balance(db, get_settings_row(db), m)))
        if t.given:
            db.add(GemGrant(member_id=t.member_id, delta=-t.given, note="Sadaqah to the man in the cloak", created_by="Honor"))
        if t.give_back:
            db.add(GemGrant(member_id=t.member_id, delta=t.give_back, note="The man in the cloak gave back more", created_by="Honor"))
    db.commit()
    return {"answer": t.answer, "given": t.given, "give_back": t.give_back if body.give else 0}


# ---------------------------------------------------------------- the carrier pigeon (a thank-you and gems)
from app.models import PigeonNote  # noqa: E402


def _pigeon_out(t: PigeonNote, m: Member | None) -> dict:
    return {"id": t.id, "member": {"id": t.member_id, "name": m.name if m else "?", "avatar": m.avatar if m else ""},
            "sender": t.sender, "gems": t.gems, "message": t.message,
            "opened_at": t.opened_at.isoformat() if t.opened_at else None, "created_at": t.created_at.isoformat()}


class PigeonIn(BaseModel):
    member_id: str
    sender: str = Field(default="", max_length=80)
    gems: int = Field(default=50, ge=0, le=10000)
    message: str = Field(default="", max_length=1500)


@router.get("/pigeon")
def list_pigeons(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    members = {m.id: m for m in db.scalars(select(Member))}
    rows = db.scalars(select(PigeonNote).order_by(PigeonNote.created_at.desc()).limit(100))
    return [_pigeon_out(t, members.get(t.member_id)) for t in rows]


@router.post("/pigeon", status_code=201)
def send_pigeon(body: PigeonIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, body.member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    t = PigeonNote(member_id=m.id, sender=body.sender.strip() or v.name, gems=body.gems, message=body.message.strip(),
                   created_by=v.name)
    db.add(t)
    db.commit()
    return _pigeon_out(t, m)


@router.delete("/pigeon/{note_id}", status_code=204)
def cancel_pigeon(note_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    t = db.get(PigeonNote, note_id)
    if t and not t.opened_at:  # an opened note's gems are already theirs
        db.delete(t)
        db.commit()


def pigeon_for(db: Session, member_id: str) -> dict | None:
    t = db.scalar(select(PigeonNote).where(PigeonNote.member_id == member_id, PigeonNote.opened_at.is_(None))
                  .order_by(PigeonNote.created_at).limit(1))
    return {"id": t.id, "sender": t.sender, "gems": t.gems, "message": t.message} if t else None


@router.post("/pigeon/{note_id}/open")
def open_pigeon(note_id: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The member opened the note: the gift of gems is theirs (once)."""
    t = db.get(PigeonNote, note_id)
    if not t:
        raise HTTPException(404, "No such note")
    if v.kind != "member" or v.id != t.member_id:
        raise HTTPException(403, "Not your note")
    if t.opened_at:
        return {"gems": 0}
    t.opened_at = datetime.now(timezone.utc)
    if t.gems:
        db.add(GemGrant(member_id=t.member_id, delta=t.gems, note=f"A gift from {t.sender} (carrier pigeon)", created_by="Honor"))
    db.commit()
    return {"gems": t.gems}


# ---------------------------------------------------------------- the rude kid (Gentle Heart)
from app.models import BullyTest, QuizTest  # noqa: E402

BULLY_GOBI_PRICE = 25


def _member_brief(db: Session, member_id: str) -> dict:
    m = db.get(Member, member_id)
    return {"id": member_id, "name": m.name if m else "?", "avatar": m.avatar if m else ""}


def _bully_out(db: Session, t: BullyTest) -> dict:
    return {"id": t.id, "member": _member_brief(db, t.member_id), "answer": t.answer, "paid": t.paid,
            "answered_at": t.answered_at.isoformat() if t.answered_at else None, "created_at": t.created_at.isoformat()}


class MemberOnlyIn(BaseModel):
    member_id: str


@router.get("/bully")
def list_bully(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return [_bully_out(db, t) for t in db.scalars(select(BullyTest).order_by(BullyTest.created_at.desc()).limit(100))]


@router.post("/bully", status_code=201)
def send_bully(body: MemberOnlyIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, body.member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    if db.scalar(select(BullyTest.id).where(BullyTest.member_id == m.id, BullyTest.answer == "")):
        raise HTTPException(400, f"The rude kid is already waiting for {m.name}")
    t = BullyTest(member_id=m.id, created_by=v.name)
    db.add(t)
    db.commit()
    return _bully_out(db, t)


@router.delete("/bully/{test_id}", status_code=204)
def cancel_bully(test_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    t = db.get(BullyTest, test_id)
    if t and not t.answer:
        db.delete(t)
        db.commit()


def bully_for(db: Session, member_id: str) -> dict | None:
    t = db.scalar(select(BullyTest).where(BullyTest.member_id == member_id, BullyTest.answer == "")
                  .order_by(BullyTest.created_at).limit(1))
    return {"id": t.id, "price": BULLY_GOBI_PRICE} if t else None


class BullyAnswerIn(BaseModel):
    choice: str = Field(pattern="^(gobi|mean|kind)$")


@router.post("/bully/{test_id}/answer")
def answer_bully(test_id: str, body: BullyAnswerIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    from app.services import gem_balance, get_settings_row
    t = db.get(BullyTest, test_id)
    if not t:
        raise HTTPException(404, "No such test")
    if v.kind != "member" or v.id != t.member_id:
        raise HTTPException(403, "Not your test")
    if t.answer:
        raise HTTPException(400, "Already answered")
    if body.choice == "gobi":
        m = db.get(Member, t.member_id)
        if gem_balance(db, get_settings_row(db), m) < BULLY_GOBI_PRICE:
            raise HTTPException(400, f"You need {BULLY_GOBI_PRICE} gems for the Mega Gobi")
        db.add(GemGrant(member_id=t.member_id, delta=-BULLY_GOBI_PRICE, note="Launched a Mega Gobi at the rude kid", created_by="Honor"))
        t.paid = BULLY_GOBI_PRICE
    t.answer, t.answered_at = body.choice, datetime.now(timezone.utc)
    db.commit()
    return {"answer": t.answer, "paid": t.paid}


# ---------------------------------------------------------------- the owl's quiz scroll
class QuizQuestionIn(BaseModel):
    q: str = Field(min_length=1, max_length=300)
    options: list[str] = Field(min_length=2, max_length=4)
    answer: int = Field(ge=0, le=3)


class QuizIn(BaseModel):
    member_id: str
    questions: list[QuizQuestionIn] = Field(min_length=1, max_length=5)
    gems_each: int = Field(default=10, ge=0, le=1000)


def _quiz_out(db: Session, t: QuizTest) -> dict:
    right = sum(1 for q, a in zip(t.questions, t.answers) if a == q["answer"])
    return {"id": t.id, "member": _member_brief(db, t.member_id), "questions": t.questions, "gems_each": t.gems_each,
            "answers": t.answers, "right": right, "finished_at": t.finished_at.isoformat() if t.finished_at else None,
            "created_at": t.created_at.isoformat()}


@router.get("/quiz")
def list_quiz(_: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return [_quiz_out(db, t) for t in db.scalars(select(QuizTest).order_by(QuizTest.created_at.desc()).limit(100))]


@router.post("/quiz", status_code=201)
def send_quiz(body: QuizIn, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, body.member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    qs = []
    for q in body.questions:
        opts = [o.strip() for o in q.options]
        if any(not o or len(o) > 120 for o in opts) or q.answer >= len(opts):
            raise HTTPException(400, "Every answer needs some text, and the right one must be one of them")
        qs.append({"q": q.q.strip(), "options": opts, "answer": q.answer})
    t = QuizTest(member_id=m.id, questions=qs, gems_each=body.gems_each, answers=[-1] * len(qs), created_by=v.name)
    db.add(t)
    db.commit()
    return _quiz_out(db, t)


@router.delete("/quiz/{test_id}", status_code=204)
def cancel_quiz(test_id: str, _: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    t = db.get(QuizTest, test_id)
    if t and all(a == -1 for a in t.answers):
        db.delete(t)
        db.commit()


def quiz_for(db: Session, member_id: str) -> dict | None:
    """The next unfinished quiz, without the right answers (except for questions already answered)."""
    t = db.scalar(select(QuizTest).where(QuizTest.member_id == member_id, QuizTest.finished_at.is_(None))
                  .order_by(QuizTest.created_at).limit(1))
    if not t:
        return None
    return {"id": t.id, "gems_each": t.gems_each, "answers": t.answers,
            "questions": [{"q": q["q"], "options": q["options"], **({"answer": q["answer"]} if a != -1 else {})}
                          for q, a in zip(t.questions, t.answers)]}


class QuizAnswerIn(BaseModel):
    index: int = Field(ge=0, le=4)
    choice: int = Field(ge=0, le=3)


@router.post("/quiz/{test_id}/answer")
def answer_quiz(test_id: str, body: QuizAnswerIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """One answer at a time (one try each): right earns gems_each straight away."""
    t = db.get(QuizTest, test_id)
    if not t:
        raise HTTPException(404, "No such quiz")
    if v.kind != "member" or v.id != t.member_id:
        raise HTTPException(403, "Not your quiz")
    if body.index >= len(t.questions):
        raise HTTPException(400, "No such question")
    answers = list(t.answers)
    if answers[body.index] != -1:
        raise HTTPException(400, "Already answered")
    q = t.questions[body.index]
    answers[body.index] = body.choice
    t.answers = answers
    right = body.choice == q["answer"]
    if right and t.gems_each:
        db.add(GemGrant(member_id=t.member_id, delta=t.gems_each, note="A right answer on the owl's quiz", created_by="Honor"))
    if all(a != -1 for a in answers):
        t.finished_at = datetime.now(timezone.utc)
    db.commit()
    return {"right": right, "answer": q["answer"], "gems": t.gems_each if right else 0,
            "score": sum(1 for x, a in zip(t.questions, answers) if a == x["answer"]), "done": t.finished_at is not None}
