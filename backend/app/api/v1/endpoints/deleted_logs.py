from typing import List

from fastapi import APIRouter

from app.core.dependencies import CurrentUser
from app.models.challan import ChallanOut, DeletedLogOut
from app.services.challan_service import ChallanService
from app.services.deleted_logs_service import DeletedLogsService

router = APIRouter()


@router.get("", response_model=List[DeletedLogOut])
async def list_deleted_logs(_user: CurrentUser) -> List[DeletedLogOut]:
    return await DeletedLogsService().list_logs()


@router.post("/{log_id}/restore", response_model=ChallanOut)
async def restore_deleted_log(log_id: str, user: CurrentUser) -> ChallanOut:
    return await ChallanService().restore_from_deleted_log(log_id, user)
