from typing import Any, Dict, Optional

from app.db.mongodb import COL_CHALLAN_RECEIPT, get_db


class ChallanReceiptRepository:
    def __init__(self) -> None:
        self.col = get_db()[COL_CHALLAN_RECEIPT]

    async def find_by_challan_number(self, challan_number: str) -> Optional[Dict[str, Any]]:
        return await self.col.find_one({"challan_number": challan_number})
