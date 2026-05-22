import { cn } from "@/lib/utils";
import { formatStatusLabel, statusBadgeClass } from "@/lib/challanStatus";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusBadgeClass(status),
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {formatStatusLabel(status)}
    </span>
  );
}
