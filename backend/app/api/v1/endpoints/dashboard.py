from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser
from app.models.dashboard import DashboardOut
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("", response_model=DashboardOut)
async def get_dashboard(
    _user: CurrentUser,
    mode: str = Query(default="lifetime", pattern="^(lifetime|day|range)$"),
    day: Optional[date] = None,
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
) -> DashboardOut:
    return await DashboardService().get_dashboard(
        mode=mode, day=day, date_from=from_date, date_to=to_date
    )
