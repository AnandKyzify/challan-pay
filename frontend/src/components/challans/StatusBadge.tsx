import { cn } from "@/lib/utils";
import { formatStatusLabel, statusBadgeClass } from "@/lib/challanStatus";

export function StatusBadge({
  status,
  className,
  nowrap = true,
  title,
}: {
  status: string;
  className?: string;
  /** Keep label on one line (list table). Popup can pass nowrap={false}. */
  nowrap?: boolean;
  title?: string;
}) {
  const label = formatStatusLabel(status);
  return (
    <span
      title={title ?? label}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
        nowrap && "whitespace-nowrap",
        statusBadgeClass(status),
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
      <span>{label}</span>
    </span>
  );
}
