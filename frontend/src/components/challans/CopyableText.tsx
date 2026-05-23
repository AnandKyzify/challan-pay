import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyableText({
  value,
  className,
  title = "Copy",
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className={cn("group/copy flex min-w-0 max-w-full items-center gap-1", className)}>
      <span className="min-w-0 truncate">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={title}
        aria-label={title}
        className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover/copy:opacity-100 focus-visible:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
