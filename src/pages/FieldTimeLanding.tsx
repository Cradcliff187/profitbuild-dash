/**
 * Field-worker time landing (`/time-tracker` under the `field_worker_v2`
 * flag).
 *
 * GATING ASSUMPTION: this page performs NO self-gating. The route
 * orchestrator mounts it at `/time-tracker` only for field-only users with
 * the `field_worker_v2` flag ON. If mounting rules change, gate at the
 * router — not here.
 *
 * TIMER: this page intentionally has NO visible timer affordance (removed
 * Jul 15 2026 per Chris, backed by usage data: 355/356 time entries in the
 * prior 90 days were quarter-hour manual-form values; live clock-in was used
 * once). `/time-tracker/timer` still exists as an unlisted escape hatch
 * during rollout — delete the route too once v2 has been stable in the
 * field. The flag-off legacy timer is untouched.
 *
 * House rules — this is the field-worker post-login critical path, i.e. the
 * auth-loop danger zone (Gotchas #53/#54/#55/#56/#63):
 * - ZERO realtime subscriptions; plain `useQuery` only (see fieldTimeData.ts).
 * - User comes from `useAuth()` context — never `supabase.auth.getUser()`.
 *   The shared Create/Edit dialogs internally call `getUser()` on their own
 *   mount/save paths, so they are mounted LAZILY (first interaction), keeping
 *   this page's mount path free of auth round-trips.
 * - No localStorage.
 *
 * Layout: explicitly tuned for 390px phones AND 768/1024px iPads via
 * responsive Tailwind (sm/md) — NOT `useIsMobile()`, whose 768px break would
 * put iPads on the wrong side. At md+ the weekly summary halves sit
 * side-by-side, the action buttons share one row, and recent entries go
 * two-column. Touch targets are ≥44px throughout.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  format,
  previousFriday,
  startOfWeek,
  subDays,
} from "date-fns";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateForDB } from "@/utils/dateUtils";
import { CreateTimeEntryDialog } from "@/components/time-tracker/CreateTimeEntryDialog";
import { EditTimeEntryDialog } from "@/components/time-tracker/EditTimeEntryDialog";
import { WeeklySummary } from "@/components/field-time/WeeklySummary";
import { RecentEntriesList } from "@/components/field-time/RecentEntriesList";
import { CopyDayEntriesSheet } from "@/components/field-time/CopyDayEntriesSheet";
import {
  FieldTimeEntry,
  invalidateFieldTimeQueries,
  useMyDayTimeEntries,
  useMyRecentTimeEntries,
  useMyWeekAssignmentDates,
  useMyWeekTimeEntries,
} from "@/components/field-time/fieldTimeData";

type CopySource = "yesterday" | "friday";

/** Copy-source button with a tooltip explaining WHY it's disabled when the
 *  source day has no entries. Tooltip needs the span wrapper because disabled
 *  buttons don't emit pointer events. */
function CopySourceButton({
  label,
  emptyTooltip,
  loading,
  empty,
  onClick,
}: {
  label: string;
  emptyTooltip: string;
  loading: boolean;
  empty: boolean;
  onClick: () => void;
}) {
  const button = (
    <Button
      variant="outline"
      className="min-h-[48px] w-full"
      disabled={loading || empty}
      onClick={onClick}
    >
      <Copy className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  if (!loading && empty) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full" tabIndex={0}>
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent>{emptyTooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return button;
}

export default function FieldTimeLanding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Date-only strings from local time via the house helper (never
  // `new Date('YYYY-MM-DD')`). Recomputed each render, so a focus refetch
  // after midnight rolls the query keys forward.
  const now = new Date();
  const todayISO = formatDateForDB(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Mon–Sun
  // Cheap to rebuild per render; the query keys derive from the stable
  // weekStartISO STRING, so array identity doesn't matter.
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    formatDateForDB(addDays(weekStart, i))
  );
  const weekStartISO = weekDays[0];
  const weekEndISO = weekDays[6];
  const yesterdayISO = formatDateForDB(subDays(now, 1));
  // `previousFriday` excludes the given date, so on a Friday it returns the
  // Friday one week back — which is what "last Friday" means here.
  const lastFridayISO = formatDateForDB(previousFriday(now));

  // --- Queries (plain useQuery, staleTime 60s, no realtime) ---
  const weekEntriesQuery = useMyWeekTimeEntries(
    user?.id,
    weekStartISO,
    weekEndISO
  );
  const weekAssignmentsQuery = useMyWeekAssignmentDates(
    user?.id,
    weekStartISO,
    weekEndISO
  );
  const recentQuery = useMyRecentTimeEntries(user?.id);
  const yesterdayQuery = useMyDayTimeEntries(user?.id, yesterdayISO);
  // On Saturdays yesterday IS last Friday — the shared query key means only
  // one fetch fires for both buttons.
  const fridayQuery = useMyDayTimeEntries(user?.id, lastFridayISO);

  // --- Dialog state. The shared dialogs are mounted lazily (first use) —
  // originally because their internal `supabase.auth.getUser()` calls had to
  // stay OFF this page's mount path (Gotcha #63). Those calls were removed
  // Jul 17 2026 (dialogs now read useAuth() context); the lazy-mount stays as
  // cheap deferral, and after first use the dialogs stay mounted so close
  // animations work. ---
  const [createOpen, setCreateOpen] = useState(false);
  const [createEverOpened, setCreateEverOpened] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FieldTimeEntry | null>(null);
  const [editEverOpened, setEditEverOpened] = useState(false);
  const [copySource, setCopySource] = useState<CopySource | null>(null);

  const handleSaved = () => {
    invalidateFieldTimeQueries(queryClient);
  };

  const openCreate = () => {
    setCreateEverOpened(true);
    setCreateOpen(true);
  };

  const openEdit = (entry: FieldTimeEntry) => {
    setEditEverOpened(true);
    setEditingEntry(entry);
  };

  // Map to the exact `TimeEntry` shape EditTimeEntryDialog accepts.
  const editEntry = editingEntry
    ? {
        id: editingEntry.id,
        payee_id: editingEntry.payee_id,
        project_id: editingEntry.project_id,
        expense_date: editingEntry.expense_date,
        amount: editingEntry.amount,
        description: editingEntry.description ?? "",
        user_id: editingEntry.user_id ?? undefined,
        start_time: editingEntry.start_time ?? undefined,
        end_time: editingEntry.end_time ?? undefined,
        attachment_url: editingEntry.attachment_url ?? undefined,
        approval_status: editingEntry.approval_status ?? undefined,
        is_locked: editingEntry.is_locked ?? undefined,
        rejection_reason: editingEntry.rejection_reason ?? undefined,
        lunch_taken: editingEntry.lunch_taken ?? undefined,
        lunch_duration_minutes: editingEntry.lunch_duration_minutes,
      }
    : null;

  const copyLabel = copySource === "yesterday" ? "yesterday" : "last Friday";
  const copyDateISO = copySource === "yesterday" ? yesterdayISO : lastFridayISO;
  const copyEntries =
    copySource === "yesterday"
      ? yesterdayQuery.data ?? []
      : fridayQuery.data ?? [];

  const friendlyDate = format(now, "EEEE, MMM d");

  return (
    <TooltipProvider delayDuration={150}>
      <MobilePageWrapper
        enablePullToRefresh
        onRefresh={async () => {
          await invalidateFieldTimeQueries(queryClient);
        }}
      >
        <div className="mx-auto max-w-2xl space-y-5 px-4 sm:px-0 md:max-w-4xl">
          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold leading-tight">Time</h1>
            <p className="text-sm text-muted-foreground">{friendlyDate}</p>
          </header>

          {/* Weekly summary — internally responsive (halves side-by-side at md+) */}
          <WeeklySummary
            weekDays={weekDays}
            todayISO={todayISO}
            entries={weekEntriesQuery.data ?? []}
            assignmentDates={weekAssignmentsQuery.data ?? []}
            loading={weekEntriesQuery.isPending || weekAssignmentsQuery.isPending}
          />

          {/* Actions — 390px: Add full-width with copy buttons paired below;
              768px+: everything on one row. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Button
              size="lg"
              className="col-span-2 min-h-[52px] text-base font-semibold"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add time entry
            </Button>
            <CopySourceButton
              label="Copy yesterday"
              emptyTooltip="No entries yesterday"
              loading={yesterdayQuery.isPending}
              empty={(yesterdayQuery.data ?? []).length === 0}
              onClick={() => setCopySource("yesterday")}
            />
            <CopySourceButton
              label="Copy last Friday"
              emptyTooltip="No entries last Friday"
              loading={fridayQuery.isPending}
              empty={(fridayQuery.data ?? []).length === 0}
              onClick={() => setCopySource("friday")}
            />
          </div>

          {/* Recent entries */}
          <section aria-label="Recent time entries" className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recent entries
            </h2>
            <RecentEntriesList
              entries={recentQuery.data ?? []}
              loading={recentQuery.isPending}
              onSelect={openEdit}
            />
          </section>

        </div>

        {/* Shared dialogs — lazily mounted (see Gotcha #63 note above) */}
        {createEverOpened && (
          <CreateTimeEntryDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSaved={handleSaved}
          />
        )}
        {editEverOpened && (
          <EditTimeEntryDialog
            entry={editEntry}
            open={!!editingEntry}
            onOpenChange={(open) => {
              if (!open) setEditingEntry(null);
            }}
            onSaved={() => {
              handleSaved();
              setEditingEntry(null);
            }}
          />
        )}
        {copySource && user && (
          <CopyDayEntriesSheet
            open
            onOpenChange={(open) => {
              if (!open) setCopySource(null);
            }}
            sourceLabel={copyLabel}
            sourceDateISO={copyDateISO}
            entries={copyEntries}
            currentUserId={user.id}
            todayISO={todayISO}
          />
        )}
      </MobilePageWrapper>
    </TooltipProvider>
  );
}
