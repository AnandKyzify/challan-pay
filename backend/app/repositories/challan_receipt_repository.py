from typing import Any, Dict, List, Optional, Set

from app.db.mongodb import COL_CHALLAN_RECEIPT, get_db


def _has_receipt_base64(doc: Dict[str, Any]) -> bool:
    raw = doc.get("receipt_base64")
    return bool(raw and str(raw).strip())


class ChallanReceiptRepository:
    def __init__(self) -> None:
        self.col = get_db()[COL_CHALLAN_RECEIPT]

    async def find_by_challan_number(self, challan_number: str) -> Optional[Dict[str, Any]]:
        return await self.col.find_one({"challan_number": challan_number})

    async def find_present_challan_numbers(self, challan_numbers: List[str]) -> Set[str]:
        numbers = [n for n in challan_numbers if n]
        if not numbers:
            return set()
        cursor = self.col.find(
            {"challan_number": {"$in": numbers}},
            {"challan_number": 1, "receipt_base64": 1},
        )
        docs = await cursor.to_list(length=len(numbers))
        return {
            str(d["challan_number"])
            for d in docs
            if d.get("challan_number") and _has_receipt_base64(d)
        }
