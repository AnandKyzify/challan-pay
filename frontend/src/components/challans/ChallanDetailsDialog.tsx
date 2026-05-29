import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptStatusBadge } from "./ReceiptStatusBadge";
import { StatusBadge } from "./StatusBadge";
import { StatusTimeline } from "./StatusTimeline";
import { isBrowser } from "@/lib/apiBase";
import { TIMELINE_STATUS, normalizeTimelineStatus } from "@/lib/challanStatus";
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/format";
import { getApiErrorMessage } from "@/services/api";
import { challanService } from "@/services/challanService";

export function ChallanDetailsDialog({
  challanId,
  open,
  onOpenChange,
}: {
  challanId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: challan, isLoading } = useQuery({
    queryKey: ["challan", challanId],
    queryFn: () => challanService.getById(challanId!),
    enabled: open && !!challanId && isBrowser,
  });

  const [showLoading, setShowLoading] = useState(true);
  useEffect(() => {
    setShowLoading(isLoading);
  }, [isLoading]);

  const [updatedHint, setUpdatedHint] = useState<string | undefined>();
  useEffect(() => {
    if (challan) setUpdatedHint(relativeTime(challan.updatedAt));
    else setUpdatedHint(undefined);
  }, [challan?.updatedAt]);

  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const isPaid = challan ? normalizeTimelineStatus(challan.status) === TIMELINE_STATUS.PAID : false;
  const receiptPresent = Boolean(challan?.receiptPresent);

  const handleDownloadReceipt = async () => {
    if (!challan) return;
    setDownloadingReceipt(true);
    try {
      const { receiptBase64 } = await challanService.getReceipt(challan.id);
      const binary = atob(receiptBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt_${challan.challanNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? "Receipt not available");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl">
        {showLoading && !challan ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : challan ? (
          <>
            <div className="border-b px-6 py-4">
              <div className="flex items-start gap-4 pr-10">
                <div className="min-w-0 flex-1 space-y-1">
                  <DialogTitle className="text-left text-xl font-semibold tracking-tight">
                    {challan.challanNumber}
                  </DialogTitle>
                  <DialogDescription className="text-left text-sm">
                    Order {challan.orderId} · Created {formatDateTime(challan.createdAt)}
                  </DialogDescription>
                </div>
                <div className="flex max-w-[42%] shrink-0 flex-col items-end gap-1.5 pt-0.5">
                  <ReceiptStatusBadge present={receiptPresent} />
                  {isPaid && receiptPresent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={Boolean(downloadingReceipt)}
                      onClick={() => void handleDownloadReceipt()}
                    >
                      {downloadingReceipt ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download Receipt
                    </Button>
                  )}
                  <StatusBadge
                    status={challan.status}
                    nowrap={false}
                    className="max-w-full whitespace-normal text-right leading-snug"
                  />
                  {challan.deleted && (
                    <Badge variant="destructive" className="text-xs">
                      Deleted
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2 sm:gap-6">
              <section className="min-w-0 rounded-lg border bg-card p-4 sm:p-5">
                <h4 className="mb-4 text-sm font-semibold text-foreground">Challan information</h4>
                <dl className="flex flex-col gap-3.5">
                  <DetailField label="Challan #" value={challan.challanNumber} mono />
                  <DetailField label="Order ID" value={challan.orderId} mono />
                  <DetailField label="RC Number" value={challan.rcNumber} mono />
                  <DetailField label="Amount" value={formatCurrency(challan.amount)} highlight />
                  <DetailField label="Current status" value="">
                    <StatusBadge
                      status={challan.status}
                      nowrap={false}
                      className="max-w-full whitespace-normal leading-snug"
                    />
                  </DetailField>
                  <DetailField label="Created" value={formatDateTime(challan.createdAt)} />
                  <DetailField
                    label="Last updated"
                    value={formatDateTime(challan.updatedAt)}
                    hint={updatedHint}
                  />
                </dl>
              </section>

              <section className="flex min-h-0 max-h-[min(60vh,28rem)] min-w-0 flex-col rounded-lg border bg-card p-4 sm:p-5">
                <h4 className="mb-2 shrink-0 text-sm font-semibold text-foreground">Status updates</h4>
                <p className="mb-3 shrink-0 text-xs text-muted-foreground">
                  {challan.timeline.length} step{challan.timeline.length === 1 ? "" : "s"}, oldest first
                </p>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                  <StatusTimeline challan={challan} layout="list" compactTime />
                </div>
              </section>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  value,
  hint,
  mono,
  highlight,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5">
      <dt className="pt-0.5 text-sm leading-snug text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        <div className="flex min-w-0 flex-col items-end gap-0.5">
          {children ?? (
            <span
              className={`block max-w-full text-right text-sm font-medium leading-snug text-foreground ${
                mono ? "break-all font-mono text-[13px]" : "break-words"
              } ${highlight ? "text-base font-semibold text-primary" : ""}`}
            >
              {value}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </dd>
    </div>
  );
}
