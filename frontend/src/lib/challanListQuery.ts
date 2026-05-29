import type { DashboardDateFilterState } from "@/components/dashboard/DashboardDateFilter";

export type ChallanListQuery = {
  mode: "lifetime" | "day" | "range";
  day?: string;
  from?: string;
  to?: string;
};

function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toChallanListQuery(filter: DashboardDateFilterState): ChallanListQuery {
  if (filter.mode === "lifetime") return { mode: "lifetime" };
  if (filter.mode === "day" && filter.day) {
    return { mode: "day", day: toLocalYmd(filter.day) };
  }
  const from = filter.range?.from;
  if (!from) return { mode: "lifetime" };
  const to = filter.range?.to ?? from;
  return {
    mode: "range",
    from: toLocalYmd(from),
    to: toLocalYmd(to),
  };
}

export function challanListQueryParams(query: ChallanListQuery): string {
  const params = new URLSearchParams({ mode: query.mode });
  if (query.day) params.set("day", query.day);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return params.toString();
}
