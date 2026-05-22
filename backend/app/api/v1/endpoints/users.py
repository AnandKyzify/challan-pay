from typing import List

from fastapi import APIRouter

from app.core.dependencies import AdminUser
from app.models.user import CreateUserRequest, UserListItem
from app.services.user_service import UserService

router = APIRouter()


@router.post("", response_model=UserListItem, status_code=201)
async def create_user(body: CreateUserRequest, _admin: AdminUser) -> UserListItem:
    return await UserService().create_user(body)


@router.get("", response_model=List[UserListItem])
async def list_users(_admin: AdminUser) -> List[UserListItem]:
    return await UserService().list_users()


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: AdminUser) -> None:
    await UserService().delete_user(admin, user_id)
