from app.core.exceptions import unauthorized
from app.core.security import create_access_token, verify_password
from app.models.auth import LoginRequest, LoginResponse, UserOut
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self) -> None:
        self.users = UserRepository()

    async def login(self, body: LoginRequest) -> LoginResponse:
        user = await self.users.find_by_username(body.username.strip().lower())
        if not user or not verify_password(body.password, user["password_hash"]):
            raise unauthorized("Invalid username or password")

        token = create_access_token(
            str(user["_id"]),
            extra={"role": user.get("role"), "username": user.get("username")},
        )
        return LoginResponse(token=token, user=self._to_user_out(user))

    def _to_user_out(self, user: dict) -> UserOut:
        role = str(user.get("role", "user"))
        if role == "administrator":
            role = "admin"
        return UserOut(
            id=str(user["_id"]),
            username=user["username"],
            name=user.get("name", user["username"]),
            email=user.get("email", ""),
            role=role,
        )

    async def me(self, user: dict) -> UserOut:
        return self._to_user_out(user)
