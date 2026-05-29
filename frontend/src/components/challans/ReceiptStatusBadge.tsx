import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ReceiptStatusBadge({
  present,
  className,
}: {
  present: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        present
          ? "border-success/35 bg-success/10 text-success"
          : "border-muted-foreground/25 bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      {present ? "Present" : "Not present"}
    </Badge>
  );
}
