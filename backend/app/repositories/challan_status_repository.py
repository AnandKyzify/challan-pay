from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId

from app.db.mongodb import COL_CHALLAN_STATUS, get_db


class ChallanStatusRepository:
    def __init__(self) -> None:
        self.col = get_db()[COL_CHALLAN_STATUS]

    async def find_by_challan_order(self, challan_no: str, order_no: str) -> Optional[Dict[str, Any]]:
        return await self.col.find_one(
            {
                "$or": [
                    {"challanNumber": challan_no, "orderId": order_no},
                    {"challan_no": challan_no, "order_no": order_no},
                ]
            }
        )

    async def find_many_by_pairs(
        self, pairs: List[Tuple[str, str]]
    ) -> Dict[Tuple[str, str], Dict[str, Any]]:
        if not pairs:
            return {}
        or_clauses = []
        for challan_no, order_no in pairs:
            or_clauses.append({"challanNumber": challan_no, "orderId": order_no})
            or_clauses.append({"challan_no": challan_no, "order_no": order_no})
        cursor = self.col.find({"$or": or_clauses})
        docs = await cursor.to_list(length=len(or_clauses) * 2)
        out: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for doc in docs:
            cno = doc.get("challanNumber") or doc.get("challan_no") or ""
            ono = doc.get("orderId") or doc.get("order_no") or ""
            out[(str(cno), str(ono))] = doc
        return out

    async def upsert_timeline(
        self, challan_no: str, order_no: str, timeline: List[Dict[str, Any]], latest_status: str
    ) -> None:
        await self.col.update_one(
            {"challanNumber": challan_no, "orderId": order_no},
            {
                "$set": {
                    "challanNumber": challan_no,
                    "orderId": order_no,
                    "challan_no": challan_no,
                    "order_no": order_no,
                    "timeline": timeline,
                    "latestStatus": latest_status,
                }
            },
            upsert=True,
        )

    async def append_timeline_entry(
        self, challan_no: str, order_no: str, entry: Dict[str, Any], latest_status: str
    ) -> None:
        existing = await self.find_by_challan_order(challan_no, order_no)
        timeline = list((existing or {}).get("timeline") or [])
        timeline.append(entry)
        await self.upsert_timeline(challan_no, order_no, timeline, latest_status)

    async def delete_by_challan_order(self, challan_no: str, order_no: str) -> int:
        """Remove all status rows for this challan/order pair (both field naming styles)."""
        res = await self.col.delete_many(
            {
                "$or": [
                    {"challanNumber": challan_no, "orderId": order_no},
                    {"challan_no": challan_no, "order_no": order_no},
                ]
            }
        )
        return int(res.deleted_count)

    async def restore_from_snapshot(self, snap: Dict[str, Any]) -> None:
        """Recreate status document exactly as stored at delete time (no extra fields)."""
        doc = {k: v for k, v in snap.items() if k not in ("deleted", "deleted_at")}
        has_camel = bool(doc.get("challanNumber") and doc.get("orderId"))
        has_snake = bool(doc.get("challan_no") and doc.get("order_no"))
        if has_camel and has_snake:
            doc.pop("challan_no", None)
            doc.pop("order_no", None)
        raw_id = snap.get("_id")
        oid: Optional[ObjectId] = None
        if isinstance(raw_id, ObjectId):
            oid = raw_id
        elif isinstance(raw_id, str) and ObjectId.is_valid(raw_id):
            oid = ObjectId(raw_id)
        if oid is not None:
            doc["_id"] = oid
            await self.col.replace_one({"_id": oid}, doc, upsert=True)
            return
        doc.pop("_id", None)
        await self.col.insert_one(doc)

    async def insert_timeline_doc(
        self,
        challan_no: str,
        order_no: str,
        timeline: List[Dict[str, Any]],
        latest_status: Optional[str] = None,
        *,
        use_camel_keys: bool = True,
    ) -> None:
        """Insert a status row for restore fallback without adding duplicate key styles."""
        if use_camel_keys:
            doc: Dict[str, Any] = {
                "challanNumber": challan_no,
                "orderId": order_no,
                "timeline": timeline,
            }
        else:
            doc = {
                "challan_no": challan_no,
                "order_no": order_no,
                "timeline": timeline,
            }
        if latest_status:
            doc["latestStatus"] = latest_status
        await self.col.insert_one(doc)
