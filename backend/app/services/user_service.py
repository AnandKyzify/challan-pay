from app.core.exceptions import bad_request, conflict, not_found
from app.core.security import hash_password
from app.models.user import CreateUserRequest, UserListItem
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self) -> None:
        self.users = UserRepository()

    async def create_user(self, body: CreateUserRequest) -> UserListItem:
        username = body.username.strip().lower()
        existing = await self.users.find_by_username(username)
        if existing:
            raise conflict("Username already exists")

        doc = await self.users.create(
            {
                "username": username,
                "password_hash": hash_password(body.password),
                # Requested by user: admin should be able to view created credentials.
                # Keep this only for internal/demo usage.
                "password_plain": body.password,
                "role": "user",
                "active": True,
            }
        )
        return self._to_item(doc)

    async def list_users(self) -> list[UserListItem]:
        docs = await self.users.list_all()
        return [self._to_item(d) for d in docs]

    async def delete_user(self, admin_doc: dict, user_id: str) -> None:
        if str(admin_doc["_id"]) == user_id:
            raise bad_request("You cannot delete your own account")

        target = await self.users.find_by_id(user_id)
        if not target:
            raise not_found("User not found")

        if not await self.users.deactivate(user_id):
            raise not_found("User not found")

    def _to_item(self, doc: dict) -> UserListItem:
        created = doc.get("created_at")
        return UserListItem(
            id=str(doc["_id"]),
            username=doc["username"],
            role=doc.get("role", "user"),
            password=doc.get("password_plain", ""),
            created_at=created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
        )
