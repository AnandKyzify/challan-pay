import type { DashboardDateFilterState } from "@/components/dashboard/DashboardDateFilter";

export type ChallanListQuery = {
  mode: "lifetime" | "day" | "range";
  day?: string;
  from?: string;
  to?: string;
};

export function toChallanListQuery(filter: DashboardDateFilterState): ChallanListQuery {
  if (filter.mode === "lifetime") return { mode: "lifetime" };
  if (filter.mode === "day" && filter.day) {
    return { mode: "day", day: filter.day.toISOString().slice(0, 10) };
  }
  const from = filter.range?.from;
  if (!from) return { mode: "lifetime" };
  const to = filter.range?.to ?? from;
  return {
    mode: "range",
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function challanListQueryParams(query: ChallanListQuery): string {
  const params = new URLSearchParams({ mode: query.mode });
  if (query.day) params.set("day", query.day);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return params.toString();
}
