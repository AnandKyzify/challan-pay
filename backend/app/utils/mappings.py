"""Map between MongoDB field names / legacy statuses and frontend timeline codes."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union

# challan_detail.status -> frontend timeline code
DETAIL_STATUS_TO_TIMELINE: Dict[str, str] = {
    "challan_initiated": "PAYMENT_INITIATED",
    "payment_initiated": "PAYMENT_INITIATED",
    "challan_validated": "CHALLAN_VALIDATED",
    "payment_link_generated": "PAYMENT_LINK_GENERATED",
    "paid": "PAID",
    "challan_sent_in_court": "CHALLAN_SENT_IN_COURT",
    "challan_added": "PAYMENT_INITIATED",
}

TIMELINE_TO_DETAIL: Dict[str, str] = {
    "PAYMENT_INITIATED": "challan_initiated",
    "CHALLAN_VALIDATED": "challan_validated",
    "PAYMENT_LINK_GENERATED": "payment_link_generated",
    "PAID": "paid",
    "CHALLAN_SENT_IN_COURT": "challan_sent_in_court",
}


def normalize_timeline_status(status: str) -> str:
    s = status.strip().replace(" ", "_").upper()
    if s in TIMELINE_TO_DETAIL:
        return s
    lower = status.strip().lower()
    return DETAIL_STATUS_TO_TIMELINE.get(lower, s)


def detail_status_to_timeline(status: str) -> str:
    key = status.strip().lower()
    if key in DETAIL_STATUS_TO_TIMELINE:
        return DETAIL_STATUS_TO_TIMELINE[key]
    return normalize_timeline_status(status)


def timeline_to_detail_status(status: str) -> str:
    code = normalize_timeline_status(status)
    return TIMELINE_TO_DETAIL.get(code, status.strip().lower())


def is_court_timeline_status(status: str) -> bool:
    """Align with frontend `isCourtStatus` (timeline code or legacy labels)."""
    if not status:
        return False
    if "COURT" in status.upper():
        return True
    return normalize_timeline_status(status) == "CHALLAN_SENT_IN_COURT"


def parse_any_datetime(value: Any) -> Optional[datetime]:
    """Parse MongoDB/string datetimes; returns None if missing or unparseable."""
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.strptime(text.replace("Z", ""), fmt.replace("Z", "")).replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            continue
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def parse_detail_time(value: Optional[Union[str, datetime]]) -> datetime:
    """Legacy helper; prefers real DB values, falls back to now only when empty."""
    return parse_any_datetime(value) or datetime.now(timezone.utc)


def first_timeline_timestamp(status_doc: Optional[Dict[str, Any]]) -> Optional[datetime]:
    raw = (status_doc or {}).get("timeline") or []
    if not raw:
        return None
    return parse_any_datetime(raw[0].get("timestamp"))


def resolve_challan_created_at(
    detail: Dict[str, Any], status_doc: Optional[Dict[str, Any]]
) -> datetime:
    """When challan was added: detail.time, then first timeline step, then created_at."""
    for key in ("time", "created_at", "createdAt"):
        dt = parse_any_datetime(detail.get(key))
        if dt:
            return dt
    dt = first_timeline_timestamp(status_doc)
    if dt:
        return dt
    return parse_detail_time(None)


def resolve_challan_updated_at(detail: Dict[str, Any]) -> datetime:
    """Last change on challan_detail (not “now” unless the row has no timestamps)."""
    for key in ("updated_at", "updatedAt", "time"):
        dt = parse_any_datetime(detail.get(key))
        if dt:
            return dt
    return parse_detail_time(None)


def format_time_only(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def to_iso_utc(dt: datetime) -> str:
    """API-safe UTC instant (always ends with Z)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    ms = int(dt.microsecond / 1000)
    return dt.strftime(f"%Y-%m-%dT%H:%M:%S.{ms:03d}Z")
