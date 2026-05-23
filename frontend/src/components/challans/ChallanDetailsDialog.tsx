import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./StatusBadge";
import { StatusTimeline } from "./StatusTimeline";
import { isBrowser } from "@/lib/apiBase";
import { challanService } from "@/services/challanService";
import { formatStatusLabel } from "@/lib/challanStatus";
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/format";

export function ChallanDetailsDialog({
  challanId,
  open,
  onOpenChange,
}: {
  challanId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [editingStatus, setEditingStatus] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");

  const { data: challan, isLoading } = useQuery({
    queryKey: ["challan", challanId],
    queryFn: () => challanService.getById(challanId!),
    enabled: open && !!challanId && isBrowser,
  });

  useEffect(() => {
    if (!open) setEditingStatus(false);
  }, [open]);

  useEffect(() => {
    if (challan) setDraftStatus(formatStatusLabel(challan.status));
  }, [challan?.id, challan?.status]);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => challanService.appendTimelineStatus(challanId!, status),
    onSuccess: (updated) => {
      toast.success("Status updated — new step added to timeline");
      setEditingStatus(false);
      setDraftStatus(formatStatusLabel(updated.status));
      qc.setQueryData(["challan", challanId], updated);
      void qc.invalidateQueries({ queryKey: ["challans"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      toast.error("Could not update status");
    },
  });

  const handleSaveStatus = () => {
    if (!challan) return;
    const next = draftStatus.trim();
    if (!next) {
      toast.error("Enter a status");
      return;
    }
    const current = formatStatusLabel(challan.status);
    if (next.toLowerCase() === current.toLowerCase()) {
      toast.message("Status unchanged");
      setEditingStatus(false);
      return;
    }
    updateStatusMutation.mutate(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl">
        {isLoading && !challan ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : challan ? (
          <>
            <DialogHeader className="border-b px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    {challan.challanNumber}
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Order {challan.orderId} · Created {formatDateTime(challan.createdAt)}
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusBadge status={challan.status} />
                  {challan.deleted && (
                    <Badge variant="destructive" className="text-xs">
                      Deleted
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="grid max-h-[min(70vh,32rem)] grid-cols-2 gap-5 overflow-hidden px-6 py-5">
              <section className="flex min-h-0 flex-col overflow-y-auto rounded-lg border bg-card p-5">
                <h4 className="mb-4 shrink-0 border-b pb-3 text-sm font-semibold text-foreground">
                  Challan information
                </h4>
                <dl className="flex flex-col">
                  <DetailField label="Challan #" value={challan.challanNumber} mono />
                  <DetailField label="Order ID" value={challan.orderId} mono />
                  <DetailField label="RC Number" value={challan.rcNumber} mono />
                  <DetailField label="Amount" value={formatCurrency(challan.amount)} highlight />
                  <EditableStatusField
                    label="Current status"
                    status={challan.status}
                    editing={editingStatus}
                    draftStatus={draftStatus}
                    disabled={!!challan.deleted}
                    saving={updateStatusMutation.isPending}
                    onStartEdit={() => {
                      setDraftStatus(formatStatusLabel(challan.status));
                      setEditingStatus(true);
                    }}
                    onCancel={() => {
                      setDraftStatus(formatStatusLabel(challan.status));
                      setEditingStatus(false);
                    }}
                    onDraftChange={setDraftStatus}
                    onSave={handleSaveStatus}
                  />
                  <DetailField label="Created" value={formatDateTime(challan.createdAt)} />
                  <DetailField
                    label="Last updated"
                    value={formatDateTime(challan.updatedAt)}
                    hint={relativeTime(challan.updatedAt)}
                    isLast
                  />
                </dl>
              </section>

              <section className="flex min-h-0 flex-col rounded-lg border bg-card p-5">
                <h4 className="mb-2 shrink-0 border-b pb-3 text-sm font-semibold text-foreground">
                  Status updates
                </h4>
                <p className="mb-3 shrink-0 text-xs text-muted-foreground">
                  All steps from challan_status, ordered by time ({challan.timeline.length}).
                </p>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                  <StatusTimeline challan={challan} layout="list" />
                </div>
              </section>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditableStatusField({
  label,
  status,
  editing,
  draftStatus,
  disabled,
  saving,
  onStartEdit,
  onCancel,
  onDraftChange,
  onSave,
}: {
  label: string;
  status: string;
  editing: boolean;
  draftStatus: string;
  disabled?: boolean;
  saving?: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(7rem,38%)_1fr] items-start gap-x-4 gap-y-2 border-b border-border/50 py-3">
      <dt className="pt-0.5 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 space-y-2 text-right">
        {editing ? (
          <>
            <Input
              value={draftStatus}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Type status…"
              className="h-9 w-full text-right"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSave();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onCancel} disabled={saving}>
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button type="button" size="sm" className="h-8" onClick={onSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={status} />
            {!disabled && (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={onStartEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        )}
      </dd>
    </div>
  );
}

function DetailField({
  label,
  value,
  hint,
  mono,
  highlight,
  isLast,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  highlight?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(7rem,38%)_1fr] items-start gap-x-4 gap-y-0.5 py-3 ${
        isLast ? "" : "border-b border-border/50"
      }`}
    >
      <dt className="pt-0.5 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">
        <span
          className={`block text-sm font-medium leading-snug text-foreground ${
            mono ? "font-mono text-[13px]" : ""
          } ${highlight ? "text-base font-semibold text-primary" : ""}`}
        >
          {value}
        </span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}
