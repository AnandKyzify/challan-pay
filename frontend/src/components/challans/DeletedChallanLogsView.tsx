import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, RefreshCw, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/challans/StatusBadge";
import { isBrowser } from "@/lib/apiBase";
import { getApiErrorMessage } from "@/services/api";
import { deletedChallanLogService } from "@/services/deletedChallanLogService";
import { ApiError } from "@/services/api";
import type { DeletedChallanLog } from "@/store/deletedChallanLogs";
import { formatStatusLabel } from "@/lib/challanStatus";
import { formatCurrency, formatDateTime } from "@/lib/format";

const PAGE_SIZE = 10;
const CELL = "px-4 py-3 align-middle text-[0.9375rem] leading-snug";
const HEAD = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function matchesLogSearch(log: DeletedChallanLog, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    log.challanNumber,
    log.orderId,
    log.rcNumber,
    String(log.amount),
    formatCurrency(log.amount),
    log.statusAtDelete,
    formatStatusLabel(log.statusAtDelete),
    log.deletedByUserName,
    log.deletedByUsername,
    log.deletedByUserEmail,
    log.deletedByUserId,
    log.deletedTime,
    formatDateTime(log.deletedAt),
    log.challanCreatedAt ? formatDateTime(log.challanCreatedAt) : "",
    log.challanId,
    log.id,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

type SortKey = "deletedAt" | "challanNumber" | "amount";

export function DeletedChallanLogsView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("deletedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [confirmRestore, setConfirmRestore] = useState<DeletedChallanLog | null>(null);

  const { data: logs = [], isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["deleted-challan-logs"],
    queryFn: () => deletedChallanLogService.list(),
    enabled: isBrowser,
  });
  const loadError = isError ? getApiErrorMessage(error) : null;

  const restoreMutation = useMutation({
    mutationFn: (logId: string) => deletedChallanLogService.restore(logId),
    onSuccess: () => {
      toast.success("Challan restored and removed from deleted logs");
      setConfirmRestore(null);
      void qc.invalidateQueries({ queryKey: ["deleted-challan-logs"] });
      void qc.invalidateQueries({ queryKey: ["challans"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : "Could not restore challan";
      toast.error(msg);
    },
  });

  const filtered = useMemo(() => {
    return logs
      .filter((log) => matchesLogSearch(log, search))
      .sort((a, b) => {
        const av =
          sortKey === "amount"
            ? a.amount
            : sortKey === "challanNumber"
              ? a.challanNumber
              : +new Date(a.deletedAt);
        const bv =
          sortKey === "amount"
            ? b.amount
            : sortKey === "challanNumber"
              ? b.challanNumber
              : +new Date(b.deletedAt);
        if (sortKey === "challanNumber") {
          const cmp = String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        }
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      });
  }, [logs, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Deleted challan logs</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search challan, order, user…"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <p className="text-sm tabular-nums text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={`${CELL} ${HEAD} w-[180px]`}>
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort("deletedAt")}>
                      Deleted at
                      <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className={`${CELL} ${HEAD} w-[180px]`}>Challan created</TableHead>
                  <TableHead className={`${CELL} ${HEAD} w-[140px]`}>
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort("challanNumber")}>
                      Challan #
                      <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className={`${CELL} ${HEAD}`}>Order ID</TableHead>
                  <TableHead className={`${CELL} ${HEAD}`}>RC Number</TableHead>
                  <TableHead className={`${CELL} ${HEAD} w-[100px] text-right`}>
                    <Button variant="ghost" size="sm" className="-mr-2 h-8 text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort("amount")}>
                      Amount
                      <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className={`${CELL} ${HEAD} w-[160px] text-center`}>Status at delete</TableHead>
                  <TableHead className={`${CELL} ${HEAD}`}>Deleted by</TableHead>
                  <TableHead className={`${CELL} ${HEAD} w-[120px] text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j} className={CELL}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : loadError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <p className="text-sm font-medium text-destructive">{loadError}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No deleted challan logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((log) => {
                    const deletedBy =
                      log.deletedByUserName?.trim() ||
                      log.deletedByUsername?.trim() ||
                      "Unknown user";
                    const deletedSub =
                      log.deletedByUserEmail?.trim() &&
                      log.deletedByUserEmail.trim() !== deletedBy
                        ? log.deletedByUserEmail.trim()
                        : log.deletedByUsername?.trim() && log.deletedByUsername.trim() !== deletedBy
                          ? log.deletedByUsername.trim()
                          : null;
                    return (
                    <TableRow key={log.id}>
                      <TableCell className={CELL}>
                        <div className="font-medium">{formatDateTime(log.deletedAt)}</div>
                      </TableCell>
                      <TableCell className={CELL}>
                        <div className="font-medium">
                          {log.challanCreatedAt ? formatDateTime(log.challanCreatedAt) : "—"}
                        </div>
                      </TableCell>
                      <TableCell className={`${CELL} font-mono text-[0.8125rem]`}>{log.challanNumber}</TableCell>
                      <TableCell className={`${CELL} font-mono text-[0.8125rem]`}>{log.orderId}</TableCell>
                      <TableCell className={CELL}>{log.rcNumber}</TableCell>
                      <TableCell className={`${CELL} text-right font-medium`}>{formatCurrency(log.amount)}</TableCell>
                      <TableCell className={`${CELL} text-center`}>
                        <StatusBadge status={log.statusAtDelete} />
                      </TableCell>
                      <TableCell className={CELL}>
                        <div className="font-medium">{deletedBy}</div>
                        {deletedSub ? (
                          <div className="text-xs text-muted-foreground">{deletedSub}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className={`${CELL} text-right`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          disabled={restoreMutation.isPending}
                          onClick={() => setConfirmRestore(log)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center border-t p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const items = [];
                      if (prev !== undefined && p - prev > 1) {
                        items.push(
                          <PaginationItem key={`ellipsis-${p}`}>
                            <span className="px-2 text-muted-foreground">…</span>
                          </PaginationItem>,
                        );
                      }
                      items.push(
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === safePage}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>,
                      );
                      return items;
                    })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRestore} onOpenChange={(o) => !o && setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this challan?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRestore
                ? `Restore challan ${confirmRestore.challanNumber} (order ${confirmRestore.orderId})?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={restoreMutation.isPending}
              onClick={() => {
                if (confirmRestore) restoreMutation.mutate(confirmRestore.id);
              }}
            >
              {restoreMutation.isPending ? "Restoring…" : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
