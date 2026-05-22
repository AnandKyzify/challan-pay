import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { AddChallanDialog } from "@/components/challans/AddChallanDialog";
import { ExportCsvDialog } from "@/components/challans/ExportCsvDialog";
import { ChallanDetailsDialog } from "@/components/challans/ChallanDetailsDialog";
import { StatusBadge } from "@/components/challans/StatusBadge";
import {
  DashboardDateFilter,
  defaultDateFilter,
  type DashboardDateFilterState,
} from "@/components/dashboard/DashboardDateFilter";
import { isBrowser } from "@/lib/apiBase";
import { toChallanListQuery } from "@/lib/challanListQuery";
import { getApiErrorMessage } from "@/services/api";
import { challanService } from "@/services/challanService";
import { LIST_STATUS_FLOW, type Challan } from "@/store/challans";
import { COURT_STATUS, formatStatusLabel, isCourtStatus } from "@/lib/challanStatus";
import { formatCurrency, formatDateTime } from "@/lib/format";

const PAGE_SIZE = 10;
const CELL = "px-5 py-4 align-middle text-sm";

export type ChallansListVariant = "default" | "court";

function matchesChallanSearch(c: Challan, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    c.challanNumber,
    c.rcNumber,
    c.orderId,
    String(c.amount),
    formatCurrency(c.amount),
    c.status,
    formatStatusLabel(c.status),
    ...c.timeline.map((t) => `${t.status} ${t.time}`),
    formatDateTime(c.createdAt),
    formatDateTime(c.updatedAt),
    c.id,
    c.deleted ? "deleted" : "active",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function inScope(c: Challan, variant: ChallansListVariant): boolean {
  if (variant === "court") return isCourtStatus(c.status);
  // Default challan list should show every challan status.
  return true;
}

export function ChallansListView({
  variant,
  title,
  description,
}: {
  variant: ChallansListVariant;
  title: string;
  description: string;
}) {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState<DashboardDateFilterState>(defaultDateFilter);
  const listQuery = useMemo(() => toChallanListQuery(dateFilter), [dateFilter]);

  const {
    data: challans = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["challans", variant, listQuery],
    queryFn: () =>
      variant === "court"
        ? challanService.listSentInCourt(listQuery)
        : challanService.list(listQuery),
    enabled: isBrowser,
  });

  const statusOptions = variant === "court" ? [COURT_STATUS] : LIST_STATUS_FLOW;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [sortKey, setSortKey] = useState<"createdAt" | "amount">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[] } | null>(null);

  const scopedChallans = useMemo(
    () => challans.filter((c) => inScope(c, variant)),
    [challans, variant],
  );

  const filtered = useMemo(() => {
    return scopedChallans
      .filter((c) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (!matchesChallanSearch(c, search)) return false;
        return true;
      })
      .sort((a, b) => {
        const av = sortKey === "amount" ? a.amount : +new Date(a[sortKey]);
        const bv = sortKey === "amount" ? b.amount : +new Date(b[sortKey]);
        return sortDir === "asc" ? av - bv : bv - av;
      });
  }, [scopedChallans, statusFilter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allSelected = paginated.length > 0 && paginated.every((c) => selected.has(c.id));

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1) return challanService.remove(ids[0]);
      return challanService.removeMany(ids);
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} challan${ids.length > 1 ? "s" : ""} deleted`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["challans"] });
      qc.invalidateQueries({ queryKey: ["deleted-challan-logs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const emptyMessage =
    variant === "court"
      ? "No challans sent in court match your filters."
      : "No challans match your filters.";
  const loadError = isError ? getApiErrorMessage(error) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
          <ExportCsvDialog
            challans={scopedChallans}
            trigger={
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Export CSV</span>
              </Button>
            }
          />
          <AddChallanDialog
            initialStatus={variant === "court" ? COURT_STATUS : undefined}
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" />
                <span className="ml-2">Add challan</span>
              </Button>
            }
          />
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-3 border-b pb-4">
            <DashboardDateFilter
              value={dateFilter}
              onChange={(next) => {
                setDateFilter(next);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-nowrap items-center gap-3">
            <div className="relative min-h-10 min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search challan, RC, order, amount, status, date…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "all" | string);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-[168px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected.size > 0 && (
              <div className="ml-auto flex shrink-0 items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">{selected.size} selected</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete({ ids: [...selected] })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="ml-1.5">Delete</span>
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table className="w-full min-w-[960px] table-fixed">
              <colgroup>
                <col style={{ width: "3rem" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className={`${CELL} w-12`}>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(c) => {
                        const next = new Set(selected);
                        if (c) paginated.forEach((p) => next.add(p.id));
                        else paginated.forEach((p) => next.delete(p.id));
                        setSelected(next);
                      }}
                    />
                  </TableHead>
                  <TableHead className={CELL}>
                    <SortBtn
                      label="Date & Time"
                      active={sortKey === "createdAt"}
                      dir={sortDir}
                      onClick={() => toggleSort("createdAt")}
                    />
                  </TableHead>
                  <TableHead className={CELL}>Challan #</TableHead>
                  <TableHead className={CELL}>RC Number</TableHead>
                  <TableHead className={CELL}>Order ID</TableHead>
                  <TableHead className={`${CELL} text-right`}>
                    <SortBtn
                      label="Amount"
                      active={sortKey === "amount"}
                      dir={sortDir}
                      onClick={() => toggleSort("amount")}
                    />
                  </TableHead>
                  <TableHead className={`${CELL} text-center`}>Status</TableHead>
                  <TableHead className={`${CELL} text-center`}>View details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {!isLoading && loadError && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <p className="text-sm font-medium text-destructive">{loadError}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ensure MongoDB is running and start the API with{" "}
                        <code className="rounded bg-muted px-1">cd backend &amp;&amp; python run.py</code>
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !loadError && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
                {paginated.map((c) => (
                  <TableRow key={c.id} className={c.deleted ? "opacity-60" : undefined}>
                    <TableCell className={CELL}>
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(c.id);
                          else next.delete(c.id);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className={`${CELL} whitespace-nowrap`}>
                      {formatDateTime(c.createdAt)}
                    </TableCell>
                    <TableCell className={`${CELL} truncate font-medium`}>{c.challanNumber}</TableCell>
                    <TableCell className={`${CELL} truncate font-mono`}>{c.rcNumber}</TableCell>
                    <TableCell className={`${CELL} truncate font-mono`}>{c.orderId}</TableCell>
                    <TableCell className={`${CELL} text-right font-medium tabular-nums`}>
                      {formatCurrency(c.amount)}
                    </TableCell>
                    <TableCell className={CELL}>
                      <div className="flex justify-center">
                        <StatusBadge status={c.status} />
                      </div>
                    </TableCell>
                    <TableCell className={CELL}>
                      <div className="flex justify-center">
                        <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setDetailId(c.id)}>
                          <Eye className="mr-2 h-4 w-4 shrink-0" />
                          View details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                  const n = i + 1;
                  return (
                    <PaginationItem key={n}>
                      <PaginationLink
                        href="#"
                        isActive={n === safePage}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(n);
                        }}
                      >
                        {n}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <ChallanDetailsDialog
        challanId={detailId}
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete challan(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.ids.length === 1
                ? "This challan will be removed from the list. You can restore it from Deleted logs if needed."
                : `${confirmDelete?.ids.length ?? 0} challans will be removed from the list. You can restore them from Deleted logs if needed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteMutation.mutate(confirmDelete.ids);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortBtn({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown
        className={`h-3 w-3 transition ${active ? "text-foreground" : ""} ${
          active && dir === "asc" ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}
