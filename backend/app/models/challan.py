from pydantic import BaseModel, Field


class TimelineEntryOut(BaseModel):
    status: str
    time: str
    timestamp: str | None = None


class ChallanOut(BaseModel):
    id: str
    challanNumber: str
    orderId: str
    rcNumber: str
    amount: float
    createdAt: str
    updatedAt: str
    status: str
    timeline: list[TimelineEntryOut]
    deleted: bool = False


class ChallanCreateRequest(BaseModel):
    challanNumber: str = Field(min_length=1)
    orderId: str = Field(min_length=1)
    amount: float = Field(gt=0)
    rcNumber: str | None = None
    initialStatus: str | None = None


class TimelineAppendRequest(BaseModel):
    status: str = Field(min_length=1)


class BulkDeleteRequest(BaseModel):
    ids: list[str] = Field(min_length=1)


class DeletedLogOut(BaseModel):
    id: str
    challanId: str
    challanNumber: str
    orderId: str
    rcNumber: str
    amount: float
    statusAtDelete: str
    deletedByUserId: str
    deletedByUsername: str = ""
    deletedByUserName: str
    deletedByUserEmail: str
    deletedAt: str
    deletedTime: str
    challanCreatedAt: str = ""
    restored: bool = False
    restoredAt: str | None = None
    restoredByUserId: str | None = None
    restoredByUserName: str | None = None
    restoredByUserEmail: str | None = None
