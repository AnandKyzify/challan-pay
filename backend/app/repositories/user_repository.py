from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.db.mongodb import COL_USERS, get_db


class UserRepository:
    def __init__(self) -> None:
        self.col = get_db()[COL_USERS]

    async def find_by_username(self, username: str) -> dict[str, Any] | None:
        return await self.col.find_one({"username": username.lower()})

    async def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        if not ObjectId.is_valid(user_id):
            return None
        return await self.col.find_one({"_id": ObjectId(user_id)})

    async def count(self) -> int:
        return await self.col.count_documents({})

    async def create(self, doc: dict[str, Any]) -> dict[str, Any]:
        doc = {**doc, "created_at": datetime.now(timezone.utc)}
        result = await self.col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    async def list_all(self) -> list[dict[str, Any]]:
        cursor = self.col.find({"active": {"$ne": False}}).sort("created_at", -1)
        return await cursor.to_list(length=500)

    async def deactivate(self, user_id: str) -> bool:
        if not ObjectId.is_valid(user_id):
            return False
        res = await self.col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"active": False}},
        )
        return res.matched_count > 0
