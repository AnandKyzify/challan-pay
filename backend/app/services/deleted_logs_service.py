from typing import List, Set

from app.models.challan import DeletedLogOut
from app.repositories.deleted_log_repository import DeletedLogRepository
from app.repositories.user_repository import UserRepository
from app.services.challan_mapper import deleted_log_to_out


class DeletedLogsService:
    """Audit trail from `challan_deleted_logs` collection (separate from challan_detail)."""

    def __init__(self) -> None:
        self._repo = DeletedLogRepository()
        self._users = UserRepository()

    async def list_logs(self, limit: int = 500) -> List[DeletedLogOut]:
        docs = await self._repo.list_all(limit=limit)
        await self._enrich_deleted_by_users(docs)
        return [deleted_log_to_out(d) for d in docs]

    async def _enrich_deleted_by_users(self, docs: List[dict]) -> None:
        """Backfill username for older logs saved before username was stored."""
        missing_ids: Set[str] = set()
        for doc in docs:
            if str(doc.get("deleted_by_user_name") or "").strip():
                continue
            if str(doc.get("deleted_by_username") or "").strip():
                continue
            uid = doc.get("deleted_by_user_id")
            if uid:
                missing_ids.add(str(uid))
        for uid in missing_ids:
            user = await self._users.find_by_id(uid)
            if not user:
                continue
            username = str(user.get("username", "")).strip()
            display = str(user.get("name", "")).strip() or username
            for doc in docs:
                if str(doc.get("deleted_by_user_id", "")) != uid:
                    continue
                doc.setdefault("deleted_by_username", username)
                doc.setdefault("deleted_by_user_name", display)
                doc.setdefault("deleted_by_user_email", str(user.get("email", "")).strip())
