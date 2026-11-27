/**
 * Weekly timesheet for the tabbed Time Tracker (admins, managers, and
 * flag-off field workers). Replaced the old `WeekView`, which listed every
 * worker's entries in one mixed feed under one mixed total — impossible to
 * audit a person from.
 *
 * Two views, one timesheet component (Chris, Nov 24 2026):
 * - **My week** — the signed-in user's own Mon–Sun week.
 * - **Team** (admin / manager only) — a roster with each person's total,
 *   pending count and problems, sorted problems-first; tap a person to open
 *   the same timesheet for them and approve the week.
 *
 * Who sees what: Team needs admin or manager, and is the DEFAULT view for
 * them even when they also hold field_worker. My week shows for anyone with
 * the field_worker role (and for a flag-off field-only user, it is the only
 * view). RLS is the real boundary — a field worker's team query would return
 * only their own rows anyway.
 *
 * House rules (this mounts on /time-tracker): no realtime, no
 * `auth.getUser()`, plain TanStack queries.
 */

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/contexts/RoleContext";
import { formatDateForDB } from "@/utils/dateUtils";
import {
  invalidateFieldTimeQueries,
  useMyWeekAssignmentDates,
  useMyWeekTimeEntries,
  type FieldTimeEntry,
} from "@/components/field-time/fieldTimeData";
import { buildWeekSheet, dayAnchorId, type WeekSheet } from "./timesheetModel";
import {
  approveTimeEntries,
  mergeRoster,
  useLaborRoster,
  useMyWorkerKind,
  useTeamWeekTimeEntries,
  type RosterPerson,
} from "./timesheetData";
import { WeekDayList, WeekSummaryCard } from "./WeekSheet";

interface TimesheetWeekProps {
  onEditEntry: (entry: FieldTimeEntry) => void;
  /** Open the create form pre-filled for a day (own time only). */
  onAddForDay: (day: string) => void;
}

interface WeekWindow {
  weekDays: string[];
  todayISO: string;
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  nextWeekDisabled: boolean;
}

function scrollToDay(day: string) {
  document
    .getElementById(dayAnchorId(day))
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** The browsable Mon–Sun payroll week shared by every timesheet view. */
function useWeekWindow(): WeekWindow {
  const [weeksBack, setWeeksBack] = useState(0);
  const now = new Date();
  const weekStart = startOfWeek(subWeeks(now, weeksBack), { weekStartsOn: 1 }); // Mon–Sun payroll week
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    formatDateForDB(addDays(weekStart, i))
  );
  const range = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;
  return {
    weekDays,
    todayISO: formatDateForDB(now),
    weekLabel: weeksBack === 0 ? `This week · ${range}` : range,
    onPrevWeek: () => setWeeksBack((w) => w + 1),
    onNextWeek: () => setWeeksBack((w) => Math.max(0, w - 1)),
    nextWeekDisabled: weeksBack === 0,
  };
}

export function TimesheetWeek({ onEditEntry, onAddForDay }: TimesheetWeekProps) {
  const { isAdmin, isManager, isFieldWorker } = useRoles();
  const canSeeTeam = isAdmin || isManager;
  const showMine = isFieldWorker || !canSeeTeam;
  // Admin is the primary view for anyone who holds it, including admin +
  // field_worker (decided by Chris, Nov 27 2026). My week stays one tap away.
  const [tab, setTab] = useState<"me" | "team">(canSeeTeam ? "team" : "me");
  const week = useWeekWindow();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {canSeeTeam && showMine && (
        <div className="flex gap-2" role="tablist" aria-label="Timesheet view">
          {(["team", "me"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "min-h-[44px] flex-1 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {t === "me" ? "My week" : "Team"}
            </button>
          ))}
        </div>
      )}

      {tab === "me" ? (
        <MyWeek week={week} onEditEntry={onEditEntry} onAddForDay={onAddForDay} />
      ) : (
        <TeamWeek week={week} onEditEntry={onEditEntry} />
      )}
    </div>
  );
}

/**
 * The Team roster on its own — the admin/manager review surface mounted on
 * `/time-entries` (mobile default). Same component and same approve write as
 * the Time Tracker's Team tab; there is no "My week" here because logging your
 * own time lives on the Time Tracker.
 */
export function TeamTimesheet({
  onEditEntry,
  onChanged,
}: {
  onEditEntry: (entry: FieldTimeEntry) => void;
  /** Called after a week is approved, so a host page can refresh its own lists. */
  onChanged?: () => void;
}) {
  const week = useWeekWindow();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <TeamWeek week={week} onEditEntry={onEditEntry} onChanged={onChanged} />
    </div>
  );
}

function MyWeek({
  week,
  onEditEntry,
  onAddForDay,
}: {
  week: WeekWindow;
  onEditEntry: (entry: FieldTimeEntry) => void;
  onAddForDay: (day: string) => void;
}) {
  const { user } = useAuth();
  const { weekDays, todayISO } = week;
  const entriesQuery = useMyWeekTimeEntries(user?.id, weekDays[0], weekDays[6]);
  const assignmentsQuery = useMyWeekAssignmentDates(user?.id, weekDays[0], weekDays[6]);
  const kindQuery = useMyWorkerKind(user?.id);

  const sheet = useMemo(
    () =>
      buildWeekSheet({
        weekDays,
        todayISO,
        entries: entriesQuery.data ?? [],
        assignmentDates: assignmentsQuery.data ?? [],
        kind: kindQuery.data ?? "employee",
      }),
    // weekDays is rebuilt each render; its first day identifies the week.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays[0], todayISO, entriesQuery.data, assignmentsQuery.data, kindQuery.data]
  );
  const loading = entriesQuery.isPending || kindQuery.isPending;

  return (
    <>
      <WeekSummaryCard
        sheet={sheet}
        loading={loading}
        todayISO={todayISO}
        weekLabel={week.weekLabel}
        onPrevWeek={week.onPrevWeek}
        onNextWeek={week.onNextWeek}
        nextWeekDisabled={week.nextWeekDisabled}
        onSelectDate={scrollToDay}
        projectEntries={entriesQuery.data}
      />
      <WeekDayList
        sheet={sheet}
        loading={loading}
        todayISO={todayISO}
        onSelectEntry={onEditEntry}
        onAddForDay={onAddForDay}
      />
    </>
  );
}

interface RosterRow {
  person: RosterPerson;
  sheet: WeekSheet;
}

function TeamWeek({
  week,
  onEditEntry,
  onChanged,
}: {
  week: WeekWindow;
  onEditEntry: (entry: FieldTimeEntry) => void;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const { weekDays, todayISO } = week;
  const [personId, setPersonId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const entriesQuery = useTeamWeekTimeEntries(weekDays[0], weekDays[6], true);
  const rosterQuery = useLaborRoster(true);
  const loading = entriesQuery.isPending || rosterQuery.isPending;

  const rows: RosterRow[] = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    return mergeRoster(rosterQuery.data ?? [], entries)
      .map((person) => ({
        person,
        sheet: buildWeekSheet({
          weekDays,
          todayISO,
          entries: entries.filter((e) => e.payee_id === person.payeeId),
          kind: person.kind,
        }),
      }))
      .sort(
        (a, b) =>
          b.sheet.checks.length - a.sheet.checks.length ||
          b.sheet.pendingIds.length - a.sheet.pendingIds.length ||
          a.person.name.localeCompare(b.person.name)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays[0], todayISO, entriesQuery.data, rosterQuery.data]);

  const selected = personId ? rows.find((r) => r.person.payeeId === personId) : null;

  const handleApprove = async (row: RosterRow) => {
    const ids = row.sheet.pendingIds;
    if (ids.length === 0 || approving) return;
    const critical = row.sheet.checks.filter((c) => c.severity === "critical");
    if (critical.length > 0) {
      const ok = await confirm({
        title: `Approve with ${critical.length} to check?`,
        description: critical.map((c) => c.message).join(" "),
        confirmLabel: "Approve anyway",
      });
      if (!ok) return;
    }
    setApproving(true);
    try {
      await approveTimeEntries(ids, user?.id);
      toast.success(
        `${ids.length} ${ids.length === 1 ? "entry" : "entries"} approved for ${row.person.name}`
      );
      await invalidateFieldTimeQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["expenses-unapproved-count"] });
      onChanged?.();
    } catch (error) {
      console.error("Failed to approve week:", error);
      toast.error("Couldn't approve these entries. Nothing was changed.");
    } finally {
      setApproving(false);
    }
  };

  if (entriesQuery.isError || rosterQuery.isError) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <p className="text-sm">Couldn't load the team's time.</p>
        <Button
          variant="outline"
          onClick={() => {
            entriesQuery.refetch();
            rosterQuery.refetch();
          }}
        >
          Try again
        </Button>
      </Card>
    );
  }

  if (selected) {
    const pending = selected.sheet.pendingIds.length;
    return (
      <>
        {dialog}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="-ml-2 min-h-[44px] px-2"
            onClick={() => setPersonId(null)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Team
          </Button>
          <h2 className="min-w-0 truncate text-base font-semibold">
            {selected.person.name}
          </h2>
        </div>
        <WeekSummaryCard
          sheet={selected.sheet}
          loading={false}
          todayISO={todayISO}
          weekLabel={week.weekLabel}
          onPrevWeek={week.onPrevWeek}
          onNextWeek={week.onNextWeek}
          nextWeekDisabled={week.nextWeekDisabled}
          onSelectDate={scrollToDay}
        />
        <WeekDayList
          sheet={selected.sheet}
          loading={false}
          todayISO={todayISO}
          onSelectEntry={onEditEntry}
        />
        {selected.sheet.totalPaid > 0 && (
          <Button
            size="lg"
            className="min-h-[52px] w-full text-base font-semibold"
            disabled={pending === 0 || approving}
            onClick={() => handleApprove(selected)}
          >
            {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending > 0
              ? `Approve week · ${pending} pending`
              : "Week approved"}
          </Button>
        )}
      </>
    );
  }

  const needLook = rows.filter(
    (r) => r.sheet.checks.length > 0 || r.sheet.pendingIds.length > 0
  ).length;

  return (
    <>
      <Card className="flex items-center justify-between gap-2 p-3 pl-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {week.weekLabel}
          </p>
          <p className="text-sm">
            {loading
              ? "Loading…"
              : `${rows.length} ${rows.length === 1 ? "person" : "people"} · ${needLook} need a look`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={week.onPrevWeek} aria-label="Previous week">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={week.onNextWeek} disabled={week.nextWeekDisabled} aria-label="Next week">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[84px] w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
          No one is set up to log time yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <RosterRowButton
              key={row.person.payeeId}
              row={row}
              onOpen={() => setPersonId(row.person.payeeId)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function RosterRowButton({ row, onOpen }: { row: RosterRow; onOpen: () => void }) {
  const { person, sheet } = row;
  const isEmployee = person.kind === "employee";
  const checks = sheet.checks.length;
  const pending = sheet.pendingIds.length;
  // Red only when something is actually wrong; missing days and overtime are amber.
  const hasCritical = sheet.checks.some((c) => c.severity === "critical");
  // Bars share one scale so a 14-hour day visibly towers over an 8.
  const peak = Math.max(10, ...sheet.days.map((d) => d.paidHours));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${person.name}, ${sheet.totalPaid.toFixed(1)} hours, ${checks} to check, ${pending} pending`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{person.name}</span>
          {!isEmployee && (
            <span className="shrink-0 rounded border px-1.5 text-[11px] font-medium text-muted-foreground">
              Sub
            </span>
          )}
        </p>
        <div className="mt-2 grid h-6 max-w-[160px] grid-cols-7 items-end gap-1" aria-hidden>
          {sheet.days.map((d) => (
            <span
              key={d.day}
              className={cn(
                "rounded-sm",
                d.state === "flagged"
                  ? "bg-destructive"
                  : d.state === "needs-time"
                    ? "bg-amber-500"
                    : d.paidHours > 0
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
              )}
              style={{ height: `${Math.max(12, (d.paidHours / peak) * 100)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums leading-tight">
            {sheet.totalPaid.toFixed(1)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isEmployee ? "of 40" : "hrs"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <div className="col-span-2 flex flex-wrap gap-1.5">
        {checks > 0 && (
          <Pill
            className={
              hasCritical
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            }
          >
            {checks} to check
          </Pill>
        )}
        {pending > 0 && (
          <Pill className="bg-warning-bg text-warning-fg">{pending} pending</Pill>
        )}
        {checks === 0 && pending === 0 &&
          (sheet.totalPaid > 0 ? (
            <Pill className="bg-success/10 text-success">Approved</Pill>
          ) : (
            <Pill className="bg-muted text-muted-foreground">No time</Pill>
          ))}
      </div>
    </button>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}
