from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_db() -> None:
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri, maxPoolSize=50, minPoolSize=5)
    _db = _client[settings.mongodb_db_name]


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


# Collection names (MongoDB `pan` database)
COL_CHALLAN_DETAIL = "challan_detail"
COL_CHALLAN_STATUS = "challan_status"
COL_CHALLAN_RECEIPT = "challan_receipt"
COL_DELETED_LOGS = "challan_deleted_logs"
COL_USERS = "cms_users"
