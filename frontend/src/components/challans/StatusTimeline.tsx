import type { Challan } from "@/store/challans";
import { formatStatusLabel } from "@/lib/challanStatus";
import { formatTimelineDateRows, formatTimelineWhen } from "@/lib/format";

function TimelineWhen({
  timestamp,
  timeLabel,
  compact,
}: {
  timestamp?: string | null;
  timeLabel?: string;
  compact?: boolean;
}) {
  if (compact) {
    const rows = formatTimelineDateRows(timestamp, timeLabel);
    if (!rows) return <span className="text-[10px] text-muted-foreground">—</span>;
    return (
      <div className="w-[4.75rem] shrink-0 text-right text-[10px] leading-[1.25] text-muted-foreground tabular-nums">
        <div className="whitespace-nowrap">{rows.date}</div>
        {rows.time ? <div className="whitespace-nowrap">{rows.time}</div> : null}
      </div>
    );
  }
  return (
    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
      {formatTimelineWhen(timestamp, timeLabel)}
    </span>
  );
}

/** Plain step-by-step timeline (status + time) — no graphics. */
export function StatusTimeline({
  challan,
  layout = "grid",
  compactTime = false,
}: {
  challan: Challan;
  layout?: "grid" | "list";
  compactTime?: boolean;
}) {
  if (challan.timeline.length === 0) {
    return <p className="text-sm text-muted-foreground">No status updates yet.</p>;
  }

  return (
    <ol className={layout === "list" ? "flex flex-col" : "grid grid-cols-2 gap-x-6"}>
      {challan.timeline.map((entry, index) => (
        <li
          key={`${entry.status}-${entry.timestamp ?? entry.time}-${index}`}
          className="grid grid-cols-[0.375rem_minmax(0,1fr)_4.75rem] items-start gap-x-2 py-2.5"
        >
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50" aria-hidden />
          <span className="min-w-0 break-words text-[13px] font-medium leading-snug text-foreground">
            {formatStatusLabel(entry.status)}
          </span>
          <TimelineWhen timestamp={entry.timestamp} timeLabel={entry.time} compact={compactTime} />
        </li>
      ))}
    </ol>
  );
}
