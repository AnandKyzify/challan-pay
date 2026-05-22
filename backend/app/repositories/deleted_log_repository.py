from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.db.mongodb import COL_DELETED_LOGS, get_db
from app.utils.mappings import format_time_only, resolve_challan_created_at


def _user_audit_fields(user: Dict[str, Any], prefix: str) -> Dict[str, str]:
    """Build deleted_by_* / restored_by_* fields; always include username for display."""
    username = str(user.get("username", "")).strip()
    display = str(user.get("name", "")).strip() or username
    email = str(user.get("email", "")).strip()
    return {
        f"{prefix}_user_id": str(user["_id"]),
        f"{prefix}_username": username,
        f"{prefix}_user_name": display,
        f"{prefix}_user_email": email,
    }


class DeletedLogRepository:
    def __init__(self) -> None:
        self.col = get_db()[COL_DELETED_LOGS]

    async def insert(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    _LIST_PROJECTION = {"detail_snapshot": 0, "status_snapshot": 0}

    async def list_all(self, limit: int = 500) -> List[Dict[str, Any]]:
        query = {"$or": [{"restored": {"$exists": False}}, {"restored": False}]}
        cursor = (
            self.col.find(query, self._LIST_PROJECTION).sort("deleted_at", -1).limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def find_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(log_id):
            return None
        return await self.col.find_one({"_id": ObjectId(log_id)})

    async def delete_by_id(self, log_id: str) -> bool:
        if not ObjectId.is_valid(log_id):
            return False
        res = await self.col.delete_one({"_id": ObjectId(log_id)})
        return res.deleted_count > 0

    async def count_not_restored(
        self,
        deleted_at_min: Optional[datetime] = None,
        deleted_at_max: Optional[datetime] = None,
    ) -> int:
        q: Dict[str, Any] = {"$or": [{"restored": {"$exists": False}}, {"restored": False}]}
        if deleted_at_min is not None or deleted_at_max is not None:
            rng: Dict[str, Any] = {}
            if deleted_at_min is not None:
                rng["$gte"] = deleted_at_min
            if deleted_at_max is not None:
                rng["$lte"] = deleted_at_max
            q["deleted_at"] = rng
        return int(await self.col.count_documents(q))

    async def create_from_challan(
        self,
        challan_doc: Dict[str, Any],
        status_at_delete: str,
        user: Dict[str, Any],
        status_doc: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        detail_snapshot = dict(challan_doc)
        status_snapshot = dict(status_doc) if status_doc else None
        challan_created_at = resolve_challan_created_at(challan_doc, status_doc)
        doc = {
            "challan_id": str(challan_doc["_id"]),
            "challan_no": challan_doc.get("challan_no"),
            "order_no": challan_doc.get("order_no"),
            "rc_no": challan_doc.get("rc_no", "NA"),
            "amount": challan_doc.get("amount", 0),
            "status_at_delete": status_at_delete,
            "detail_snapshot": detail_snapshot,
            "status_snapshot": status_snapshot,
            "restored": False,
            **_user_audit_fields(user, "deleted_by"),
            "deleted_at": now,
            "deleted_time": format_time_only(now),
            "challan_created_at": challan_created_at,
        }
        return await self.insert(doc)
