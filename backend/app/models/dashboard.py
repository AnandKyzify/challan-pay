from pydantic import BaseModel


class DashboardStatsOut(BaseModel):
    total: int
    pending: int
    paid: int
    added: int
    court: int
    deleted: int
    today: int
    month: int
    revenue: float
    court_revenue: float


class StatusCountOut(BaseModel):
    status: str
    count: int


class VolumePointOut(BaseModel):
    date: str
    count: int
    court: int = 0


class MonthlyBarOut(BaseModel):
    month_key: str
    month_label: str
    pending: float
    paid: float
    court: float


class RecentChallanOut(BaseModel):
    id: str
    challanNumber: str
    orderId: str
    amount: float
    status: str
    createdAt: str
    updatedAt: str


class DashboardOut(BaseModel):
    stats: DashboardStatsOut
    statusDistribution: list[StatusCountOut]
    volumeByDay: list[VolumePointOut]
    monthlyBars: list[MonthlyBarOut]
    recentChallans: list[RecentChallanOut]
