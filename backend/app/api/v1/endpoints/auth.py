from fastapi import APIRouter

from app.core.dependencies import CurrentUser
from app.models.auth import LoginRequest, LoginResponse, UserOut
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    return await AuthService().login(body)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return await AuthService().me(user)
