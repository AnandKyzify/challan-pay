from datetime import datetime, timezone

from app.config import get_settings
from app.core.security import hash_password
from app.db.mongodb import COL_USERS, get_db


async def ensure_indexes() -> None:
    db = get_db()
    await db["challan_detail"].create_index([("challan_no", 1), ("order_no", 1)])
    await db["challan_detail"].create_index([("deleted", 1), ("time", -1)])
    await db["challan_status"].create_index([("challanNumber", 1), ("orderId", 1)])
    await db["challan_status"].create_index([("challan_no", 1), ("order_no", 1)])
    await db["challan_status"].create_index([("challan_no", 1), ("time", 1)])
    await db["challan_status"].create_index([("challanNumber", 1), ("time", 1)])
    await db["challan_deleted_logs"].create_index([("deleted_at", -1)])
    await db[COL_USERS].create_index("username", unique=True)


async def seed_admin_user() -> None:
    settings = get_settings()
    db = get_db()
    users = db[COL_USERS]
    count = await users.count_documents({})
    if count > 0:
        return
    now = datetime.now(timezone.utc)
    await users.insert_one(
        {
            "username": settings.admin_username.lower(),
            "password_hash": hash_password(settings.admin_password),
            "password_plain": settings.admin_password,
            "role": "admin",
            "active": True,
            "created_at": now,
        }
    )
