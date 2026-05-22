import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DashboardDateFilter,
  challanMatchesDateFilter,
  defaultDateFilter,
  type DashboardDateFilterState,
} from "@/components/dashboard/DashboardDateFilter";
import { formatStatusLabel } from "@/lib/challanStatus";
import type { Challan } from "@/store/challans";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function ExportCsvDialog({
  challans,
  trigger,
}: {
  challans: Challan[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DashboardDateFilterState>(defaultDateFilter);
  const [exporting, setExporting] = useState(false);

  const exportRows = challans.filter((c) => challanMatchesDateFilter(c.createdAt, dateFilter));

  const handleExport = () => {
    setExporting(true);
    try {
      const rows = [
        ["Challan", "RC", "Order", "Amount", "Status", "Created", "Updated"],
        ...exportRows.map((c) => [
          c.challanNumber,
          c.rcNumber,
          c.orderId,
          c.amount,
          formatStatusLabel(c.status),
          formatDateTime(c.createdAt),
          formatDateTime(c.updatedAt),
        ]),
      ];
      const csv = rows
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `challans-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportRows.length} challan${exportRows.length === 1 ? "" : "s"}`);
      setOpen(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
          <DialogDescription>
            Choose a date scope for the export. Lifetime includes all challans in the list.
          </DialogDescription>
        </DialogHeader>
        <DashboardDateFilter value={dateFilter} onChange={setDateFilter} />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{exportRows.length}</span> record
          {exportRows.length === 1 ? "" : "s"} will be exported.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={exporting || exportRows.length === 0}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
