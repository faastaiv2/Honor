from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Viewer, current_viewer, require_admin
from app.models import Admin, Member
from app.ratelimit import login_limiter
from app.security import create_token, hash_secret, verify_secret
from app.services import active_members

router = APIRouter(prefix="/auth", tags=["auth"])


class MemberLogin(BaseModel):
    member_id: str
    pin: str = Field(min_length=1, max_length=12)


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
    """Names for the sign-in screen. Only members with a PIN can sign in."""
    return [{"id": m.id, "name": m.name, "avatar": m.avatar, "frame": m.frame, "has_pin": bool(m.pin_hash)}
            for m in active_members(db)]


@router.post("/member")
def member_login(body: MemberLogin, request: Request, db: Session = Depends(get_db)) -> dict:
    _limit(request, "m:" + body.member_id)
    m = db.get(Member, body.member_id)
    if not m or not m.active or not verify_secret(body.pin, m.pin_hash):
        raise HTTPException(401, "That PIN is not right")
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
