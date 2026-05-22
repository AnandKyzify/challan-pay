from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional, Tuple

from app.models.challan import ChallanOut
from app.models.dashboard import (
    DashboardOut,
    DashboardStatsOut,
    MonthlyBarOut,
    RecentChallanOut,
    StatusCountOut,
    VolumePointOut,
)
from app.repositories.deleted_log_repository import DeletedLogRepository
from app.services.challan_service import ChallanService
from app.utils.mappings import normalize_timeline_status

_PENDING = {"CHALLAN_VALIDATED", "PAYMENT_LINK_GENERATED"}


class DashboardService:
    def __init__(self) -> None:
        self.challans = ChallanService()

    async def get_dashboard(
        self,
        mode: str = "lifetime",
        day: Optional[date] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> DashboardOut:
        all_challans = await self.challans.list_challans(include_deleted=True)
        scoped = [c for c in all_challans if self._matches_filter(c, mode, day, date_from, date_to)]

        active = [c for c in scoped if not c.deleted]
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)

        dmin, dmax = self._deleted_at_window(mode, day, date_from, date_to)
        deleted_n = await DeletedLogRepository().count_not_restored(dmin, dmax)

        stats = DashboardStatsOut(
            total=len(active),
            pending=sum(1 for c in active if normalize_timeline_status(c.status) in _PENDING),
            paid=sum(1 for c in active if normalize_timeline_status(c.status) == "PAID"),
            added=sum(1 for c in active if normalize_timeline_status(c.status) == "PAYMENT_INITIATED"),
            court=sum(
                1 for c in active if normalize_timeline_status(c.status) == "CHALLAN_SENT_IN_COURT"
            ),
            deleted=deleted_n,
            today=sum(1 for c in active if self._parse_dt(c.createdAt) >= today_start),
            month=sum(1 for c in active if self._parse_dt(c.createdAt) >= month_start),
            revenue=sum(c.amount for c in active if normalize_timeline_status(c.status) == "PAID"),
            court_revenue=sum(
                c.amount for c in active if normalize_timeline_status(c.status) == "CHALLAN_SENT_IN_COURT"
            ),
        )

        status_counter = Counter(normalize_timeline_status(c.status) for c in active)
        status_distribution = [
            StatusCountOut(status=s, count=n) for s, n in status_counter.most_common()
        ]

        volume_by_day = self._volume_last_14_days(active)
        monthly_bars = self._monthly_bars(active, months=6)

        recent = sorted(
            active,
            key=lambda c: c.updatedAt if c.updatedAt else c.createdAt,
            reverse=True,
        )[:8]
        recent_out = [
            RecentChallanOut(
                id=c.id,
                challanNumber=c.challanNumber,
                orderId=c.orderId,
                amount=c.amount,
                status=c.status,
                createdAt=c.createdAt,
                updatedAt=c.updatedAt,
            )
            for c in recent
        ]

        return DashboardOut(
            stats=stats,
            statusDistribution=status_distribution,
            volumeByDay=volume_by_day,
            monthlyBars=monthly_bars,
            recentChallans=recent_out,
        )

    def _volume_last_14_days(self, active: List[ChallanOut]) -> List[VolumePointOut]:
        today = datetime.now(timezone.utc).date()
        counts: defaultdict[str, int] = defaultdict(int)
        courts: defaultdict[str, int] = defaultdict(int)
        for c in active:
            d = self._parse_dt(c.createdAt).date().isoformat()
            counts[d] += 1
            if normalize_timeline_status(c.status) == "CHALLAN_SENT_IN_COURT":
                courts[d] += 1

        out: List[VolumePointOut] = []
        for i in range(13, -1, -1):
            d_str = (today - timedelta(days=i)).isoformat()
            out.append(
                VolumePointOut(date=d_str, count=counts.get(d_str, 0), court=courts.get(d_str, 0)),
            )
        return out

    def _monthly_bars(self, active: List[ChallanOut], months: int = 6) -> List[MonthlyBarOut]:
        keys: List[Tuple[int, int]] = []
        now = datetime.now(timezone.utc)
        y, m = now.year, now.month
        for _ in range(months):
            keys.append((y, m))
            m -= 1
            while m <= 0:
                m += 12
                y -= 1
        keys.reverse()

        pend: defaultdict[str, float] = defaultdict(float)
        paid_: defaultdict[str, float] = defaultdict(float)
        court_: defaultdict[str, float] = defaultdict(float)

        for c in active:
            dt = self._parse_dt(c.createdAt)
            key = f"{dt.year}-{dt.month:02d}"
            amt = float(c.amount or 0)
            st = normalize_timeline_status(c.status)
            if st == "PAID":
                paid_[key] += amt
            elif st in _PENDING:
                pend[key] += amt
            elif st == "CHALLAN_SENT_IN_COURT":
                court_[key] += amt

        out: List[MonthlyBarOut] = []
        for y_k, m_k in keys:
            key = f"{y_k}-{m_k:02d}"
            lbl = datetime(y_k, m_k, 1, tzinfo=timezone.utc).strftime("%b")
            out.append(
                MonthlyBarOut(
                    month_key=key,
                    month_label=lbl,
                    pending=pend.get(key, 0.0),
                    paid=paid_.get(key, 0.0),
                    court=court_.get(key, 0.0),
                )
            )
        return out

    def _deleted_at_window(
        self,
        mode: str,
        day: Optional[date],
        date_from: Optional[date],
        date_to: Optional[date],
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        tz = timezone.utc
        if mode == "lifetime":
            return None, None
        if mode == "day" and day:
            start = datetime.combine(day, time.min, tzinfo=tz)
            end = datetime.combine(day, time.max, tzinfo=tz)
            return start, end
        if mode == "range" and date_from:
            end = date_to or date_from
            start = datetime.combine(date_from, time.min, tzinfo=tz)
            end_dt = datetime.combine(end, time.max, tzinfo=tz)
            return start, end_dt
        return None, None

    def _parse_dt(self, iso: str) -> datetime:
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            return datetime.now(timezone.utc)

    def _matches_filter(
        self,
        c: ChallanOut,
        mode: str,
        day: Optional[date],
        date_from: Optional[date],
        date_to: Optional[date],
    ) -> bool:
        if mode == "lifetime":
            return True
        created = self._parse_dt(c.createdAt).date()
        if mode == "day" and day:
            return created == day
        if mode == "range" and date_from:
            end = date_to or date_from
            return date_from <= created <= end
        return True

