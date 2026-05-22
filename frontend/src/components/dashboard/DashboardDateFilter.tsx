import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseDbInstant } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DashboardDateMode = "lifetime" | "range" | "day";

export interface DashboardDateFilterState {
  mode: DashboardDateMode;
  day?: Date;
  range?: DateRange;
}

export const defaultDateFilter: DashboardDateFilterState = { mode: "lifetime" };

export function DashboardDateFilter({
  value,
  onChange,
}: {
  value: DashboardDateFilterState;
  onChange: (next: DashboardDateFilterState) => void;
}) {
  const [open, setOpen] = useState(false);

  const summary =
    value.mode === "lifetime"
      ? "Lifetime data"
      : value.mode === "day" && value.day
        ? format(value.day, "dd MMM yyyy")
        : value.mode === "range" && value.range?.from
          ? value.range.to
            ? `${format(value.range.from, "dd MMM")} – ${format(value.range.to, "dd MMM yyyy")}`
            : format(value.range.from, "dd MMM yyyy")
          : "Select dates";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.mode}
        onValueChange={(mode) => {
          const next = mode as DashboardDateMode;
          if (next === "lifetime") {
            onChange({ mode: "lifetime" });
            setOpen(false);
            return;
          }
          if (next === "day") {
            onChange({ mode: "day", day: value.day ?? new Date() });
            return;
          }
          onChange({
            mode: "range",
            range: value.range?.from
              ? value.range
              : { from: new Date(), to: new Date() },
          });
        }}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lifetime">Lifetime data</SelectItem>
          <SelectItem value="day">Particular date</SelectItem>
          <SelectItem value="range">Date range</SelectItem>
        </SelectContent>
      </Select>

      {value.mode !== "lifetime" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2 font-normal")}>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {summary}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            {value.mode === "day" ? (
              <Calendar
                mode="single"
                selected={value.day}
                onSelect={(day) => {
                  if (day) onChange({ mode: "day", day });
                }}
                initialFocus
              />
            ) : (
              <Calendar
                mode="range"
                selected={value.range}
                onSelect={(range) => onChange({ mode: "range", range })}
                numberOfMonths={2}
                initialFocus
              />
            )}
          </PopoverContent>
        </Popover>
      )}

      {value.mode === "lifetime" && (
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          All time
        </span>
      )}
    </div>
  );
}

export function challanMatchesDateFilter(
  createdAt: string,
  filter: DashboardDateFilterState,
): boolean {
  if (filter.mode === "lifetime") return true;

  const created = parseDbInstant(createdAt);
  if (!created) return true;
  created.setHours(0, 0, 0, 0);

  if (filter.mode === "day" && filter.day) {
    const day = new Date(filter.day);
    day.setHours(0, 0, 0, 0);
    return created.getTime() === day.getTime();
  }

  if (filter.mode === "range" && filter.range?.from) {
    const from = new Date(filter.range.from);
    from.setHours(0, 0, 0, 0);
    const to = filter.range.to ? new Date(filter.range.to) : filter.range.from;
    to.setHours(23, 59, 59, 999);
    const t = created.getTime();
    return t >= from.getTime() && t <= to.getTime();
  }

  return true;
}
