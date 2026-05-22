from fastapi import APIRouter

from app.api.v1.endpoints import auth, challans, dashboard, deleted_logs, users

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(challans.router, prefix="/challans", tags=["Challans"])
api_v1_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_v1_router.include_router(deleted_logs.router, prefix="/deleted-logs", tags=["Deleted logs"])
api_v1_router.include_router(users.router, prefix="/users", tags=["Users"])
