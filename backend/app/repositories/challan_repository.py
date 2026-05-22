from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.db.mongodb import COL_CHALLAN_DETAIL, get_db


class ChallanDetailRepository:
    def __init__(self) -> None:
        self.col = get_db()[COL_CHALLAN_DETAIL]

    async def find_all(self, include_deleted: bool = True) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if not include_deleted:
            query["$or"] = [{"deleted": {"$ne": True}}, {"deleted": {"$exists": False}}]
        cursor = self.col.find(query).sort("time", -1)
        return await cursor.to_list(length=10000)

    async def find_by_id(self, challan_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(challan_id):
            return None
        return await self.col.find_one({"_id": ObjectId(challan_id)})

    async def find_by_keys(self, challan_no: str, order_no: str) -> Optional[Dict[str, Any]]:
        return await self.col.find_one({"challan_no": challan_no, "order_no": order_no})

    async def insert(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    async def update_fields(self, challan_id: str, fields: Dict[str, Any]) -> bool:
        if not ObjectId.is_valid(challan_id):
            return False
        result = await self.col.update_one({"_id": ObjectId(challan_id)}, {"$set": fields})
        return result.matched_count > 0

    async def mark_deleted(self, challan_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(challan_id):
            return None
        now = datetime.now(timezone.utc)
        await self.col.update_one(
            {"_id": ObjectId(challan_id)},
            {"$set": {"deleted": True, "deleted_at": now}},
        )
        return await self.find_by_id(challan_id)

    async def mark_deleted_many(self, ids: List[str]) -> List[Dict[str, Any]]:
        oids = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
        if not oids:
            return []
        now = datetime.now(timezone.utc)
        await self.col.update_many(
            {"_id": {"$in": oids}},
            {"$set": {"deleted": True, "deleted_at": now}},
        )
        cursor = self.col.find({"_id": {"$in": oids}})
        return await cursor.to_list(length=len(oids))

    async def delete_by_id(self, challan_id: str) -> bool:
        """Permanently remove a challan detail document."""
        if not ObjectId.is_valid(challan_id):
            return False
        res = await self.col.delete_one({"_id": ObjectId(challan_id)})
        return res.deleted_count > 0

    async def restore_from_snapshot(self, snap: Dict[str, Any]) -> str:
        """Recreate challan_detail from a delete-log snapshot (original _id when present)."""
        doc = {
            k: v
            for k, v in snap.items()
            if k not in ("deleted", "deleted_at", "_id")
        }
        raw_id = snap.get("_id")
        oid: Optional[ObjectId] = None
        if isinstance(raw_id, ObjectId):
            oid = raw_id
        elif isinstance(raw_id, str) and ObjectId.is_valid(raw_id):
            oid = ObjectId(raw_id)
        if oid is not None:
            doc["_id"] = oid
            await self.col.replace_one({"_id": oid}, doc, upsert=True)
            return str(oid)
        result = await self.col.insert_one(doc)
        return str(result.inserted_id)
