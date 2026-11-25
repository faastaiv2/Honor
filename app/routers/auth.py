from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Admin, Member
from app.ratelimit import login_limiter
from app.security import create_token, hash_secret, verify_secret
from app.services import active_members, get_settings_row, progress_for, tier_of_progress, today_for
from app.tiers import shown_look

router = APIRouter(prefix="/auth", tags=["auth"])


class MemberLogin(BaseModel):
    member_id: str
    pin: str = Field(min_length=1, max_length=12)


class PinSetup(BaseModel):
    member_id: str
    pin: str = Field(pattern=r"^\d{4}$")  # a new member chooses their own 4-digit PIN


class AdminLogin(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=72)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=72)
    new_password: str = Field(min_length=10, max_length=72)


def _viewer_out(v: Viewer) -> dict:
    return {"kind": v.kind, "id": v.id, "name": v.name, "is_admin": v.is_admin}


def _limit(request: Request, key: str) -> None:
    ip = request.client.host if request.client else "?"
    if not login_limiter.hit(f"{ip}:{key}"):
        raise HTTPException(429, "Too many tries. Wait a few minutes and try again")


@router.get("/members")
def sign_in_list(db: Session = Depends(get_db)) -> list[dict]:
    """Names for the sign-in screen. A member without a PIN chooses one the first time."""
    members = active_members(db)
    cfg = get_settings_row(db)
    prog = progress_for(db, cfg, members, today_for(cfg))
    out = []
    for m in members:
        avatar, frame = shown_look(m.avatar, m.frame, tier_of_progress(prog[m.id]).key)
        out.append({"id": m.id, "name": m.name, "avatar": avatar, "frame": frame, "has_pin": bool(m.pin_hash)})
    return out


@router.post("/member")
def member_login(body: MemberLogin, request: Request, db: Session = Depends(get_db)) -> dict:
    _limit(request, "m:" + body.member_id)
    m = db.get(Member, body.member_id)
    if not m or not m.active or not verify_secret(body.pin, m.pin_hash):
        raise HTTPException(401, "That PIN is not right")
    v = Viewer("member", m.id, m.name)
    return {"token": create_token(m.id, "member"), "viewer": _viewer_out(v)}


@router.post("/member/setup")
def member_setup(body: PinSetup, request: Request, db: Session = Depends(get_db)) -> dict:
    """First sign-in for a member the parent added without a PIN: they choose their own, once."""
    _limit(request, "s:" + body.member_id)
    m = db.get(Member, body.member_id)
    if not m or not m.active:
        raise HTTPException(404, "Member not found")
    if m.pin_hash:
        raise HTTPException(409, "You already have a PIN. Type it to sign in")
    m.pin_hash = hash_secret(body.pin)
    db.commit()
    v = Viewer("member", m.id, m.name)
    return {"token": create_token(m.id, "member"), "viewer": _viewer_out(v)}


@router.post("/admin")
def admin_login(body: AdminLogin, request: Request, db: Session = Depends(get_db)) -> dict:
    email = body.email.strip().lower()
    _limit(request, "a:" + email)
    a = db.scalar(select(Admin).where(func.lower(Admin.email) == email))
    if not a or not verify_secret(body.password, a.password_hash):
        raise HTTPException(401, "Email or password is not right")
    return {"token": create_token(a.id, "admin"), "viewer": _viewer_out(Viewer("admin", a.id, a.name))}


@router.get("/me")
def me(v: Viewer = Depends(current_viewer)) -> dict:
    return _viewer_out(v)


@router.post("/password")
def change_password(body: PasswordChange, v: Viewer = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    a = db.get(Admin, v.id)
    if not verify_secret(body.current_password, a.password_hash):
        raise HTTPException(400, "Current password is not right")
    a.password_hash = hash_secret(body.new_password)
    db.commit()
    return {"ok": True}
