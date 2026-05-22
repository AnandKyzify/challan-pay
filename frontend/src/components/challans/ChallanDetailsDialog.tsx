import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import { StatusTimeline } from "./StatusTimeline";
import { isBrowser } from "@/lib/apiBase";
import { challanService } from "@/services/challanService";
import {
  COURT_STATUS,
  formatStatusLabel,
  LIST_TIMELINE_STATUSES,
  normalizeTimelineStatus,
} from "@/lib/challanStatus";
import { formatCurrency, formatDateTime, relativeTime } from "@/lib/format";

function statusOptionsForChallan(status: string, timeline: { status: string }[]): string[] {
  const base = [...LIST_TIMELINE_STATUSES, COURT_STATUS];
  const extras = [status, ...timeline.map((t) => t.status)].map(normalizeTimelineStatus);
  return [...new Set([...base, ...extras])];
}

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
    if (challan) setDraftStatus(normalizeTimelineStatus(challan.status));
  }, [challan?.id, challan?.status]);

  const statusOptions = useMemo(
    () => (challan ? statusOptionsForChallan(challan.status, challan.timeline) : []),
    [challan],
  );

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => challanService.appendTimelineStatus(challanId!, status),
    onSuccess: (updated) => {
      toast.success("Status updated — new step added to timeline");
      setEditingStatus(false);
      setDraftStatus(normalizeTimelineStatus(updated.status));
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
    const next = normalizeTimelineStatus(draftStatus);
    const current = normalizeTimelineStatus(challan.status);
    if (next === current) {
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

            <div className="grid grid-cols-2 gap-5 px-6 py-5">
              <section className="flex flex-col rounded-lg border bg-card p-5">
                <h4 className="mb-4 border-b pb-3 text-sm font-semibold text-foreground">
                  Challan information
                </h4>
                <dl className="flex flex-1 flex-col">
                  <DetailField label="Challan #" value={challan.challanNumber} mono />
                  <DetailField label="Order ID" value={challan.orderId} mono />
                  <DetailField label="RC Number" value={challan.rcNumber} mono />
                  <DetailField label="Amount" value={formatCurrency(challan.amount)} highlight />
                  <EditableStatusField
                    label="Current status"
                    status={challan.status}
                    editing={editingStatus}
                    draftStatus={draftStatus}
                    options={statusOptions}
                    disabled={!!challan.deleted}
                    saving={updateStatusMutation.isPending}
                    onStartEdit={() => {
                      setDraftStatus(normalizeTimelineStatus(challan.status));
                      setEditingStatus(true);
                    }}
                    onCancel={() => {
                      setDraftStatus(normalizeTimelineStatus(challan.status));
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

              <section className="flex flex-col rounded-lg border bg-card p-5">
                <h4 className="mb-4 border-b pb-3 text-sm font-semibold text-foreground">
                  Status updates
                </h4>
                <p className="mb-3 text-xs text-muted-foreground">
                  Each status change adds a new step (append-only).
                </p>
                <StatusTimeline challan={challan} layout="list" />
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
  options,
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
  options: string[];
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
            <Select value={draftStatus} onValueChange={onDraftChange}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
