import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ScrollText,
  Clock3,
  CheckCircle2,
  Trash2,
  Activity,
  Scale,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardDateFilter,
  defaultDateFilter,
} from "@/components/dashboard/DashboardDateFilter";
import { isBrowser } from "@/lib/apiBase";
import { getApiErrorMessage } from "@/services/api";
import { dashboardService } from "@/services/dashboardService";
import { normalizeTimelineStatus, TIMELINE_STATUS } from "@/lib/challanStatus";
import { formatCurrency, relativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/challans/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [dateFilter, setDateFilter] = useState(defaultDateFilter);
  const dashboardQuery = useMemo(() => {
    if (dateFilter.mode === "lifetime") return { mode: "lifetime" as const };
    if (dateFilter.mode === "day" && dateFilter.day) {
      return { mode: "day" as const, day: dateFilter.day.toISOString().slice(0, 10) };
    }
    const from = dateFilter.range?.from;
    if (!from) return { mode: "lifetime" as const };
    const to = dateFilter.range?.to ?? from;
    return {
      mode: "range" as const,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, [dateFilter]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", dashboardQuery],
    queryFn: () => dashboardService.get(dashboardQuery),
    enabled: isBrowser,
  });
  const loadError = isError ? getApiErrorMessage(error) : null;

  const stats = data?.stats ?? {
    total: 0,
    pending: 0,
    paid: 0,
    added: 0,
    court: 0,
    deleted: 0,
    today: 0,
    month: 0,
    revenue: 0,
    court_revenue: 0,
  };

  const pieData = useMemo(() => {
    let initiated = 0;
    let inProgress = 0;
    let paid = 0;
    let court = 0;
    let other = 0;

    for (const row of data?.statusDistribution ?? []) {
      const code = normalizeTimelineStatus(row.status);
      const n = row.count;
      if (code === TIMELINE_STATUS.PAYMENT_INITIATED) initiated += n;
      else if (
        code === TIMELINE_STATUS.CHALLAN_VALIDATED ||
        code === TIMELINE_STATUS.PAYMENT_LINK_GENERATED
      )
        inProgress += n;
      else if (code === TIMELINE_STATUS.PAID) paid += n;
      else if (code === TIMELINE_STATUS.CHALLAN_SENT_IN_COURT) court += n;
      else other += n;
    }

    const slices = [
      { name: "Initiated", value: initiated, color: "var(--color-chart-5)" },
      { name: "In progress", value: inProgress, color: "var(--color-chart-3)" },
      { name: "Paid", value: paid, color: "var(--color-chart-2)" },
      { name: "Sent in court", value: court, color: "var(--color-primary)" },
      { name: "Other", value: other, color: "var(--color-muted)" },
    ];
    return slices.filter((s) => s.value > 0);
  }, [data?.statusDistribution]);

  const dailyData = useMemo(
    () =>
      (data?.volumeByDay ?? []).map((p) => ({
        date: new Date(`${p.date}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        count: p.count,
        court: p.court,
      })),
    [data?.volumeByDay],
  );

  const monthlyData = useMemo(
    () =>
      (data?.monthlyBars ?? []).map((m) => ({
        month: m.month_label,
        pending: m.pending,
        paid: m.paid,
        court: m.court,
      })),
    [data?.monthlyBars],
  );

  const recent = data?.recentChallans ?? [];

  return (
    <div className="space-y-6">
      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-destructive">{loadError}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start MongoDB, then run the API:{" "}
                <code className="rounded bg-muted px-1">cd backend &amp;&amp; python run.py</code>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview including sent-in-court challans wherever counts and amounts apply.
          </p>
        </div>
        <DashboardDateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total challans" value={stats.total} icon={ScrollText} tone="primary" />
        <StatCard label="Pending (validated / link)" value={stats.pending} icon={Clock3} tone="warning" />
        <StatCard label="Paid" value={stats.paid} icon={CheckCircle2} tone="success" />
        <StatCard label="Sent in court" value={stats.court} icon={Scale} tone="primary" />
        <StatCard label="Deleted" value={stats.deleted} icon={Trash2} tone="destructive" />
        <StatCard label="Today (new)" value={stats.today} icon={Activity} tone="info" />
        <StatCard label="This month (new)" value={stats.month} icon={TrendingUp} tone="primary" />
        <StatCard label="Payment initiated" value={stats.added} icon={ScrollText} tone="info" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{formatCurrency(stats.revenue)} paid collections</Badge>
        <Badge variant="outline">{formatCurrency(stats.court_revenue)} in sent-in-court amounts</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
            <CardDescription>Active challans grouped by latest status</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {pieData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No challans in this date range.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily challans</CardTitle>
            <CardDescription>Last 14 days — total new challans vs sent-in-court (same creation day)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCourt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="All challans"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#gradTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="court"
                  name="Sent in court"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#gradCourt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Monthly revenue</CardTitle>
              <CardDescription>Pending, paid, and sent-in-court totals (₹) by creation month</CardDescription>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge variant="secondary">{formatCurrency(stats.revenue)} paid</Badge>
              <Badge variant="outline">{formatCurrency(stats.court_revenue)} court</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="pending" name="Pending pipe" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Paid" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="court" name="Sent in court" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest updates (sorted by last update)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading dashboard…</p>}
            {!isLoading && recent.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
            {recent.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.challanNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.orderId} · {formatCurrency(c.amount)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={c.status} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {relativeTime(c.updatedAt || c.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "success" | "destructive" | "info";
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning dark:text-warning",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
