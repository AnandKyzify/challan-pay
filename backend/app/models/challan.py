from typing import List, Optional

from pydantic import BaseModel, Field


class TimelineEntryOut(BaseModel):
    status: str
    time: str
    timestamp: Optional[str] = None


class ChallanOut(BaseModel):
    id: str
    challanNumber: str
    orderId: str
    rcNumber: str
    amount: float
    createdAt: str
    updatedAt: str
    status: str
    timeline: List[TimelineEntryOut]
    deleted: bool = False


class ChallanCreateRequest(BaseModel):
    challanNumber: str = Field(min_length=1)
    orderId: str = Field(min_length=1)
    amount: float = Field(gt=0)
    rcNumber: Optional[str] = None
    initialStatus: Optional[str] = None


class TimelineAppendRequest(BaseModel):
    status: str = Field(min_length=1)


class BulkDeleteRequest(BaseModel):
    ids: List[str] = Field(min_length=1)


class ChallanReceiptOut(BaseModel):
    receiptBase64: str


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
    restoredAt: Optional[str] = None
    restoredByUserId: Optional[str] = None
    restoredByUserName: Optional[str] = None
    restoredByUserEmail: Optional[str] = None
