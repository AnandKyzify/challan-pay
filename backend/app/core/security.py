from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

# Support BOTH old bcrypt hashes and new pbkdf2 hashes
pwd_context = CryptContext(
    schemes=["bcrypt", "pbkdf2_sha256"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    subject: str,
    extra: Optional[Dict[str, Any]] = None
) -> str:
    settings = get_settings()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expire_minutes
    )

    payload: Dict[str, Any] = {
        "sub": subject,
        "exp": expire
    }

    if extra:
        payload.update(extra)

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )


def decode_access_token(token: str) -> Dict[str, Any]:
    settings = get_settings()

    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )

    except JWTError as exc:
        raise ValueError("Invalid token") from exc
