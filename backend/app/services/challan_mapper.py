from datetime import datetime, timezone
from typing import Any

from app.models.challan import ChallanOut, DeletedLogOut, TimelineEntryOut
from app.utils.mappings import (
    detail_status_to_timeline,
    format_time_only,
    normalize_timeline_status,
    parse_any_datetime,
    parse_detail_time,
    resolve_challan_created_at,
    resolve_challan_updated_at,
    to_iso_utc,
)


def _pair_key(doc: dict[str, Any]) -> tuple[str, str]:
    cno = str(doc.get("challan_no") or doc.get("challanNumber") or "")
    ono = str(doc.get("order_no") or doc.get("orderId") or "")
    return cno, ono


def _build_timeline(
    detail: dict[str, Any], status_doc: dict[str, Any] | None
) -> list[TimelineEntryOut]:
    raw = (status_doc or {}).get("timeline") or []
    if raw:
        entries: list[TimelineEntryOut] = []
        for item in raw:
            status = normalize_timeline_status(str(item.get("status", "")))
            ts = item.get("timestamp")
            time_str = str(item.get("time") or "")
            dt = parse_any_datetime(ts)
            if dt and not time_str:
                time_str = format_time_only(dt)
            ts_iso = to_iso_utc(dt) if dt else (str(ts) if ts else None)
            entries.append(
                TimelineEntryOut(
                    status=status,
                    time=time_str or "—",
                    timestamp=ts_iso,
                )
            )
        return entries

    detail_status = str(detail.get("status") or "challan_initiated")
    code = detail_status_to_timeline(detail_status)
    dt = parse_detail_time(detail.get("time"))
    return [
        TimelineEntryOut(
            status=code,
            time=format_time_only(dt),
            timestamp=to_iso_utc(dt),
        )
    ]


def merge_challan(
    detail: dict[str, Any], status_doc: dict[str, Any] | None
) -> ChallanOut:
    cno, ono = _pair_key(detail)
    timeline = _build_timeline(detail, status_doc)
    latest = timeline[-1].status if timeline else detail_status_to_timeline(
        str(detail.get("status", ""))
    )
    created = resolve_challan_created_at(detail, status_doc)
    updated = resolve_challan_updated_at(detail)
    deleted_at = parse_any_datetime(detail.get("deleted_at"))
    if deleted_at and deleted_at > updated:
        updated = deleted_at

    return ChallanOut(
        id=str(detail["_id"]),
        challanNumber=cno,
        orderId=ono,
        rcNumber=str(detail.get("rc_no") or "NA"),
        amount=float(detail.get("amount") or 0),
        createdAt=to_iso_utc(created),
        updatedAt=to_iso_utc(updated),
        status=latest,
        timeline=timeline,
        deleted=bool(detail.get("deleted")),
    )


def merge_challans(
    details: list[dict[str, Any]], status_map: dict[tuple[str, str], dict[str, Any]]
) -> list[ChallanOut]:
    return [
        merge_challan(d, status_map.get(_pair_key(d)))
        for d in details
    ]


def deleted_log_to_out(doc: dict[str, Any]) -> DeletedLogOut:
    deleted_at = parse_any_datetime(doc.get("deleted_at"))
    deleted_at_iso = to_iso_utc(deleted_at) if deleted_at else ""
    restored_at = parse_any_datetime(doc.get("restored_at"))
    restored_at_iso = to_iso_utc(restored_at) if restored_at else None
    rb_uid = doc.get("restored_by_user_id")
    deleted_username = str(doc.get("deleted_by_username", "")).strip()
    deleted_name = str(doc.get("deleted_by_user_name", "")).strip()
    deleted_email = str(doc.get("deleted_by_user_email", "")).strip()
    deleted_display = deleted_name or deleted_username or str(doc.get("deleted_by_user_id", ""))
    created_dt = parse_any_datetime(doc.get("challan_created_at"))
    if not created_dt:
        detail_snap = doc.get("detail_snapshot") or {}
        status_snap = doc.get("status_snapshot")
        if isinstance(detail_snap, dict):
            created_dt = resolve_challan_created_at(
                detail_snap,
                status_snap if isinstance(status_snap, dict) else None,
            )
    challan_created_iso = to_iso_utc(created_dt) if created_dt else ""
    return DeletedLogOut(
        id=str(doc["_id"]),
        challanId=str(doc.get("challan_id", "")),
        challanNumber=str(doc.get("challan_no", "")),
        orderId=str(doc.get("order_no", "")),
        rcNumber=str(doc.get("rc_no", "NA")),
        amount=float(doc.get("amount") or 0),
        statusAtDelete=detail_status_to_timeline(str(doc.get("status_at_delete", ""))),
        deletedByUserId=str(doc.get("deleted_by_user_id", "")),
        deletedByUsername=deleted_username,
        deletedByUserName=deleted_display,
        deletedByUserEmail=deleted_email or deleted_username,
        deletedAt=deleted_at_iso,
        deletedTime=str(doc.get("deleted_time", "")),
        challanCreatedAt=challan_created_iso,
        restored=bool(doc.get("restored")),
        restoredAt=restored_at_iso,
        restoredByUserId=str(rb_uid) if rb_uid else None,
        restoredByUserName=str(doc.get("restored_by_user_name") or "") or None,
        restoredByUserEmail=str(doc.get("restored_by_user_email") or "") or None,
    )
