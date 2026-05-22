from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import forbidden, unauthorized
from app.core.security import decode_access_token
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    if credentials is None or not credentials.credentials:
        raise unauthorized("Missing authentication token")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise unauthorized("Invalid or expired token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized("Invalid token payload")

    user = await UserRepository().find_by_id(str(user_id))
    if not user or not user.get("active", True):
        raise unauthorized("User not found or inactive")
    return user


async def require_admin(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    role = str(user.get("role", "")).lower()
    if role not in ("admin", "administrator"):
        raise forbidden("Admin access required")
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]
AdminUser = Annotated[dict, Depends(require_admin)]
