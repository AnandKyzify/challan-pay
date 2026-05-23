import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.core.exceptions import bad_request, not_found
from app.models.challan import (
    BulkDeleteRequest,
    ChallanCreateRequest,
    ChallanOut,
    TimelineAppendRequest,
)
from app.repositories.challan_repository import ChallanDetailRepository
from app.repositories.challan_status_repository import ChallanStatusRepository
from app.repositories.deleted_log_repository import DeletedLogRepository
from app.services.challan_mapper import merge_challan, merge_challans
from app.utils.date_filter import matches_created_date
from app.utils.mappings import (
    detail_status_to_timeline,
    format_time_only,
    normalize_timeline_status,
    timeline_to_detail_status,
)


class ChallanService:
    def __init__(self) -> None:
        self.details = ChallanDetailRepository()
        self.statuses = ChallanStatusRepository()
        self.deleted_logs = DeletedLogRepository()

    async def list_challans(
        self,
        include_deleted: bool = False,
        mode: str = "lifetime",
        day: Optional[date] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[ChallanOut]:
        docs = await self.details.find_all(include_deleted=include_deleted)
        challan_nos = [
            str(d.get("challan_no") or d.get("challanNumber") or "") for d in docs
        ]
        events_map = await self.statuses.find_many_events_by_challan_nos(challan_nos)
        merged = merge_challans(docs, events_map)
        return [
            c
            for c in merged
            if matches_created_date(
                c.createdAt,
                mode=mode,
                day=day,
                date_from=date_from,
                date_to=date_to,
            )
        ]

    async def list_sent_in_court(
        self,
        mode: str = "lifetime",
        day: Optional[date] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[ChallanOut]:
        merged = await self.list_challans(
            include_deleted=False,
            mode=mode,
            day=day,
            date_from=date_from,
            date_to=date_to,
        )
        return [
            c
            for c in merged
            if normalize_timeline_status(c.status) == "CHALLAN_SENT_IN_COURT" and not c.deleted
        ]

    async def get_challan(self, challan_id: str) -> ChallanOut:
        detail = await self.details.find_by_id(challan_id)
        if not detail:
            raise not_found("Challan not found")
        cno = str(detail.get("challan_no", ""))
        ono = str(detail.get("order_no", ""))
        events = await self.statuses.find_events_by_challan_no(cno)
        status_doc = await self.statuses.find_by_challan_order(cno, ono)
        if status_doc and status_doc.get("timeline"):
            return merge_challan(detail, status_doc, events)
        return merge_challan(detail, None, events)

    async def create_challan(self, body: ChallanCreateRequest) -> ChallanOut:
        existing = await self.details.find_by_keys(body.challanNumber, body.orderId)
        if existing:
            raise bad_request("Challan with this number and order already exists")

        initial = body.initialStatus or "PAYMENT_INITIATED"
        timeline_code = normalize_timeline_status(initial)
        detail_status = timeline_to_detail_status(timeline_code)
        now = datetime.now(timezone.utc)
        time_str = now.strftime("%Y-%m-%d %H:%M:%S")

        rc = body.rcNumber
        if not rc:
            slug = re.sub(r"[^A-Z0-9]", "", body.orderId.upper())[:12] or "NA"
            rc = f"AUTO-{slug}"

        detail = await self.details.insert(
            {
                "challan_no": body.challanNumber,
                "order_no": body.orderId,
                "amount": body.amount,
                "rc_no": rc,
                "status": detail_status,
                "time": time_str,
            }
        )

        entry = {
            "status": timeline_code,
            "time": format_time_only(now),
            "timestamp": now.isoformat(),
        }
        await self.statuses.upsert_timeline(
            body.challanNumber, body.orderId, [entry], timeline_code
        )
        return await self.get_challan(str(detail["_id"]))

    async def append_timeline(self, challan_id: str, body: TimelineAppendRequest) -> ChallanOut:
        detail = await self.details.find_by_id(challan_id)
        if not detail:
            raise not_found("Challan not found")

        cno = str(detail.get("challan_no", ""))
        ono = str(detail.get("order_no", ""))
        code = normalize_timeline_status(body.status)
        now = datetime.now(timezone.utc)
        entry = {"status": code, "time": format_time_only(now), "timestamp": now.isoformat()}

        await self.statuses.append_timeline_entry(cno, ono, entry, code)
        await self.details.update_fields(
            challan_id,
            {"status": timeline_to_detail_status(code), "time": now.strftime("%Y-%m-%d %H:%M:%S")},
        )
        return await self.get_challan(challan_id)

    async def delete_challan(self, challan_id: str, user: dict) -> None:
        detail = await self.details.find_by_id(challan_id)
        if not detail:
            raise not_found("Challan not found")

        merged = await self.get_challan(challan_id)
        cno = str(detail.get("challan_no", ""))
        ono = str(detail.get("order_no", ""))
        status_doc = await self.statuses.find_by_challan_order(cno, ono)

        await self.deleted_logs.create_from_challan(
            detail, merged.status, user, status_doc
        )
        if not await self.details.delete_by_id(challan_id):
            raise bad_request("Could not remove challan record")
        await self.statuses.delete_by_challan_order(cno, ono)

    async def restore_from_deleted_log(self, log_id: str, user: dict) -> ChallanOut:
        log = await self.deleted_logs.find_by_id(log_id)
        if not log:
            raise not_found("Deleted log not found")
        if log.get("restored"):
            raise bad_request("This deletion has already been restored")

        detail_snap = log.get("detail_snapshot")
        status_snap = log.get("status_snapshot")

        if isinstance(detail_snap, dict) and detail_snap:
            cno = str(
                detail_snap.get("challan_no")
                or detail_snap.get("challanNumber")
                or ""
            )
            ono = str(detail_snap.get("order_no") or detail_snap.get("orderId") or "")
        else:
            cno = str(log.get("challan_no", ""))
            ono = str(log.get("order_no", ""))

        if await self.details.find_by_keys(cno, ono):
            raise bad_request("A challan with this challan number and order already exists")

        if isinstance(detail_snap, dict) and detail_snap:
            new_id = await self.details.restore_from_snapshot(detail_snap)
        else:
            code = normalize_timeline_status(str(log.get("status_at_delete", "")))
            now = datetime.now(timezone.utc)
            time_str = now.strftime("%Y-%m-%d %H:%M:%S")
            body: Dict[str, Any] = {
                "challan_no": cno,
                "order_no": ono,
                "amount": float(log.get("amount") or 0),
                "rc_no": str(log.get("rc_no") or "NA"),
                "status": timeline_to_detail_status(code),
                "time": time_str,
            }
            cid = str(log.get("challan_id", ""))
            if ObjectId.is_valid(cid):
                body["_id"] = ObjectId(cid)
                await self.details.restore_from_snapshot(body)
                new_id = cid
            else:
                inserted = await self.details.insert(body)
                new_id = str(inserted["_id"])

        if isinstance(status_snap, dict) and status_snap:
            await self.statuses.restore_from_snapshot(status_snap)
        else:
            if isinstance(detail_snap, dict) and detail_snap.get("status"):
                code = detail_status_to_timeline(str(detail_snap["status"]))
            else:
                code = normalize_timeline_status(str(log.get("status_at_delete", "")))
            now = datetime.now(timezone.utc)
            entry = {
                "status": code,
                "time": format_time_only(now),
                "timestamp": now.isoformat(),
            }
            await self.statuses.insert_timeline_doc(cno, ono, [entry], code)

        result = await self.get_challan(new_id)
        await self.deleted_logs.delete_by_id(log_id)
        return result

    async def delete_many(self, body: BulkDeleteRequest, user: dict) -> int:
        count = 0
        for cid in body.ids:
            try:
                await self.delete_challan(cid, user)
                count += 1
            except Exception:
                continue
        return count
