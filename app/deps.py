from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Admin, Member
from app.security import decode_token


@dataclass
class Viewer:
    kind: str  # "admin" or "member"
    id: str
    name: str

    @property
    def is_admin(self) -> bool:
        return self.kind == "admin"


def current_viewer(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> Viewer:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please sign in")
    claims = decode_token(authorization[7:])
    if not claims:
        raise HTTPException(401, "Your sign-in has expired. Please sign in again")
    if claims.get("kind") == "admin":
        a = db.get(Admin, claims.get("sub"))
        if a:
            return Viewer("admin", a.id, a.name)
    elif claims.get("kind") == "member":
        m = db.get(Member, claims.get("sub"))
        if m and m.active:
            return Viewer("member", m.id, m.name)
    raise HTTPException(401, "Please sign in again")


def require_admin(v: Viewer = Depends(current_viewer)) -> Viewer:
    if not v.is_admin:
        raise HTTPException(403, "Only a parent (admin) can do this")
    return v
