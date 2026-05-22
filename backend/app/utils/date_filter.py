"""Created-date filtering for challan list endpoints."""

from datetime import date

from app.utils.mappings import parse_detail_time


def matches_created_date(
    created_at: str,
    *,
    mode: str = "lifetime",
    day: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> bool:
    if mode == "lifetime":
        return True
    created = parse_detail_time(created_at).date()
    if mode == "day" and day:
        return created == day
    if mode == "range" and date_from:
        end = date_to or date_from
        return date_from <= created <= end
    return True
