from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import get_settings

ALGORITHM = "HS256"


def hash_secret(secret: str) -> str:
    raw = secret.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("Too long")
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=get_settings().bcrypt_rounds)).decode("ascii")


def verify_secret(secret: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    raw = secret.encode("utf-8")
    if len(raw) > 72:
        return False
    try:
        return bcrypt.checkpw(raw, hashed.encode("ascii"))
    except ValueError:
        return False


def create_token(subject_id: str, kind: str) -> str:
    """kind is "admin" or "member"."""
    s = get_settings()
    now = datetime.now(timezone.utc)
    claims = {"sub": subject_id, "kind": kind, "iat": now, "exp": now + timedelta(days=s.access_token_days)}
    return jwt.encode(claims, s.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
