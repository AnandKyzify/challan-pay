import { api } from "@/services/api";

export interface DashboardResponse {
  stats: {
    total: number;
    pending: number;
    paid: number;
    added: number;
    court: number;
    deleted: number;
    today: number;
    month: number;
    revenue: number;
    court_revenue: number;
  };
  statusDistribution: { status: string; count: number }[];
  volumeByDay: { date: string; count: number; court: number }[];
  monthlyBars: {
    month_key: string;
    month_label: string;
    pending: number;
    paid: number;
    court: number;
  }[];
  recentChallans: {
    id: string;
    challanNumber: string;
    orderId: string;
    amount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

export type DashboardQuery = {
  mode: "lifetime" | "day" | "range";
  day?: string;
  from?: string;
  to?: string;
};

export const dashboardService = {
  async get(query: DashboardQuery): Promise<DashboardResponse> {
    const params = new URLSearchParams({ mode: query.mode });
    if (query.day) params.set("day", query.day);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    return api.get<DashboardResponse>(`/dashboard?${params.toString()}`);
  },
};
