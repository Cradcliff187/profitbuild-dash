/**
 * "All entries" on a phone (admin / manager, /time-entries).
 *
 * Dense rows under a date header instead of one tall card per entry: the date,
 * start–end time and lunch are visible without a tap, a pending row carries its
 * own Approve button, and tapping a row opens the edit sheet. Roughly six
 * entries per screen where the old cards showed two.
 */
import { useMemo } from "react";
import { Clock, CheckCircle, XCircle, Trash2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { cn, formatCurrency } from "@/lib/utils";
import { parseDateOnly } from "@/utils/dateUtils";

interface TimeEntry {
  id: string;
  user_id: string;
  payee_id: string;
  worker_name: string;
  payee?: {
    employee_number?: string;
  };
  project_id: string;
  project_name: string;
  project_number: string;
  expense_date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  lunch_duration_minutes?: number;
  lunch_taken?: boolean;
  amount: number;
  approval_status: string;
  created_at: string;
  attachment_url?: string;
  description?: string;
  note?: string;
}

interface TimeEntriesCardViewProps {
  timeEntries: TimeEntry[];
  selectedIds: string[];
  onSelectOne: (id: string, checked: boolean) => void;
  onEdit: (entry: TimeEntry) => void;
  onApprove: (entryId: string) => void;
  onReject: (entry: TimeEntry) => void;
  canApprove: boolean;
  canReject: boolean;
  loading?: boolean;
  totalCount: number;
  pagination: { currentPage: number; goToPage: (page: number) => void };
  pageSize: number;
  setPageSize: (size: number) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

/** Auto-generated "7:00 AM - 3:30 PM" descriptions are not notes. */
const TIME_RANGE_PATTERN = /^\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M$/i;

const noteOf = (entry: TimeEntry): string => {
  const raw = (entry.note || entry.description || "").trim();
  return TIME_RANGE_PATTERN.test(raw) ? "" : raw;
};

const statusOf = (entry: TimeEntry): "pending" | "approved" | "rejected" => {
  const s = entry.approval_status?.toLowerCase();
  return s === "approved" || s === "rejected" ? s : "pending";
};

const STATUS_STYLE = {
  pending: { label: "Pending", className: "bg-warning-bg text-warning-fg" },
  approved: { label: "Approved", className: "bg-success/10 text-success" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
} as const;

const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")}h`;

const timeRange = (entry: TimeEntry): string => {
  if (!entry.start_time || !entry.end_time) return "";
  const range = `${format(new Date(entry.start_time), "h:mm a")} – ${format(new Date(entry.end_time), "h:mm a")}`;
  const lunch =
    entry.lunch_taken !== false && entry.lunch_duration_minutes && entry.lunch_duration_minutes > 0
      ? ` · ${entry.lunch_duration_minutes}m lunch`
      : "";
  return range + lunch;
};

export const TimeEntriesCardView = ({
  timeEntries,
  selectedIds,
  onSelectOne,
  onEdit,
  onApprove,
  onReject,
  canApprove,
  canReject,
  loading,
  totalCount,
  pagination,
  pageSize,
  setPageSize,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onClearSelection,
}: TimeEntriesCardViewProps) => {
  // Entries arrive newest-first; group consecutive rows that share a date.
  const groups = useMemo(() => {
    const out: { date: string; entries: TimeEntry[]; hours: number }[] = [];
    for (const entry of timeEntries) {
      const last = out[out.length - 1];
      if (last && last.date === entry.expense_date) {
        last.entries.push(entry);
        last.hours += entry.hours || 0;
      } else {
        out.push({ date: entry.expense_date, entries: [entry], hours: entry.hours || 0 });
      }
    }
    return out;
  }, [timeEntries]);

  if (timeEntries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Clock className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="text-sm font-medium">{loading ? "Loading time entries…" : "No time entries found"}</p>
          {!loading && <p className="mt-1 text-xs">Try clearing a filter.</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button size="sm" variant="ghost" className="h-9" onClick={onClearSelection}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <Button onClick={onBulkApprove} className="h-11 flex-1">
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
            )}
            {canReject && (
              <Button variant="outline" onClick={onBulkReject} className="h-11 flex-1">
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            )}
            <Button variant="outline" onClick={onBulkDelete} className="h-11 px-3" aria-label="Delete selected">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.date} aria-label={format(parseDateOnly(group.date), "EEEE, MMM d")}>
          <div className="mb-1.5 flex items-baseline justify-between px-1">
            <h3 className="text-sm font-semibold">{format(parseDateOnly(group.date), "EEE, MMM d")}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"} · {formatHours(group.hours)}
            </span>
          </div>
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {group.entries.map((entry) => {
              const status = statusOf(entry);
              const selected = selectedIds.includes(entry.id);
              const times = timeRange(entry);
              const note = noteOf(entry);
              return (
                <li key={entry.id} className={cn(selected && "bg-primary/5")}>
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-label={`Select ${entry.worker_name}`}
                      onClick={() => onSelectOne(entry.id, !selected)}
                      className="flex w-11 shrink-0 items-start justify-center pt-3.5 focus-visible:outline-none focus-visible:bg-muted"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border-2",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                        )}
                      >
                        {selected && <CheckCircle className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-2 text-left focus-visible:outline-none focus-visible:bg-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{entry.worker_name}</span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              STATUS_STYLE[status].className
                            )}
                          >
                            {STATUS_STYLE[status].label}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {entry.project_number ? `${entry.project_number} · ${entry.project_name}` : entry.project_name}
                        </span>
                        {times && <span className="block truncate text-xs text-muted-foreground">{times}</span>}
                        {note && <span className="mt-0.5 block line-clamp-2 text-xs italic text-muted-foreground">{note}</span>}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-bold tabular-nums leading-tight">{formatHours(entry.hours)}</span>
                        <span className="block text-xs tabular-nums text-muted-foreground">{formatCurrency(entry.amount)}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    </button>
                  </div>
                  {status === "pending" && (canApprove || canReject) && (
                    <div className="flex gap-2 pb-2.5 pl-11 pr-3">
                      {canApprove && (
                        <Button size="sm" className="h-10 flex-1" onClick={() => onApprove(entry.id)}>
                          <CheckCircle className="mr-1.5 h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {canReject && (
                        <Button size="sm" variant="outline" className="h-10 flex-1" onClick={() => onReject(entry)}>
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Reject
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {totalCount > 0 && (
        <div className="flex flex-col items-stretch gap-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                pagination.goToPage(1);
              }}
              className="h-10 rounded-md border bg-background px-2"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          {totalCount > pageSize && (
            <div className="flex w-full justify-center overflow-x-auto">
              <CompletePagination
                currentPage={pagination.currentPage}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={pagination.goToPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
