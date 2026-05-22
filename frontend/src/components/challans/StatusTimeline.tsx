import type { Challan } from "@/store/challans";
import { formatStatusLabel } from "@/lib/challanStatus";
import { formatTimelineWhen } from "@/lib/format";

/** Plain step-by-step timeline (status + time) — no graphics. */
export function StatusTimeline({
  challan,
  layout = "grid",
}: {
  challan: Challan;
  layout?: "grid" | "list";
}) {
  if (challan.timeline.length === 0) {
    return <p className="text-sm text-muted-foreground">No status updates yet.</p>;
  }

  return (
    <ol className={layout === "list" ? "flex flex-col" : "grid grid-cols-2 gap-x-6 gap-y-0"}>
      {challan.timeline.map((entry, index) => {
        const isLast = index === challan.timeline.length - 1;
        return (
          <li
            key={`${entry.status}-${entry.timestamp ?? index}`}
            className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 py-3 ${
              isLast ? "" : "border-b border-border/50"
            }`}
          >
            <span className="text-sm font-medium leading-snug text-foreground">
              {index + 1}. {formatStatusLabel(entry.status)}
            </span>
            <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              {formatTimelineWhen(entry.timestamp, entry.time)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
