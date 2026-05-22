"""
Challan HTTP routes.

Register static path segments (`/sent-in-court`, `/bulk-delete`) before `/{challan_id}`
so they are not captured as ObjectIds.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser
from app.models.challan import (
    BulkDeleteRequest,
    ChallanCreateRequest,
    ChallanOut,
    TimelineAppendRequest,
)
from app.services.challan_service import ChallanService

router = APIRouter()


@router.get("", response_model=List[ChallanOut])
async def list_challans(
    _user: CurrentUser,
    include_deleted: bool = Query(default=False),
    mode: str = Query(default="lifetime", pattern="^(lifetime|day|range)$"),
    day: Optional[date] = None,
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
) -> List[ChallanOut]:
    return await ChallanService().list_challans(
        include_deleted=include_deleted,
        mode=mode,
        day=day,
        date_from=from_date,
        date_to=to_date,
    )


@router.get("/sent-in-court", response_model=List[ChallanOut])
async def list_sent_in_court(
    _user: CurrentUser,
    mode: str = Query(default="lifetime", pattern="^(lifetime|day|range)$"),
    day: Optional[date] = None,
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
) -> List[ChallanOut]:
    """Challans whose latest timeline status is Sent in Court (smaller payload than full list)."""
    return await ChallanService().list_sent_in_court(
        mode=mode,
        day=day,
        date_from=from_date,
        date_to=to_date,
    )


@router.post("/bulk-delete")
async def bulk_delete(body: BulkDeleteRequest, user: CurrentUser) -> dict:
    deleted = await ChallanService().delete_many(body, user)
    return {"deleted": deleted}


@router.post("", response_model=ChallanOut, status_code=201)
async def create_challan(body: ChallanCreateRequest, _user: CurrentUser) -> ChallanOut:
    return await ChallanService().create_challan(body)


@router.patch("/{challan_id}/timeline", response_model=ChallanOut)
async def append_timeline(
    challan_id: str, body: TimelineAppendRequest, _user: CurrentUser
) -> ChallanOut:
    return await ChallanService().append_timeline(challan_id, body)


@router.delete("/{challan_id}", status_code=204)
async def delete_challan(challan_id: str, user: CurrentUser) -> None:
    await ChallanService().delete_challan(challan_id, user)


@router.get("/{challan_id}", response_model=ChallanOut)
async def get_challan(challan_id: str, _user: CurrentUser) -> ChallanOut:
    return await ChallanService().get_challan(challan_id)
