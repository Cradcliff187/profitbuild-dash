/**
 * Admin Crew Dispatch board (`/dispatch`).
 *
 * Gates:
 *  1. Role — admins/managers only. Others get a Navigate to "/" (field workers
 *     are already bounced by the AppLayout allowlist, Gotcha #44).
 *  2. Feature flag — `crew_dispatch_board` via useDbFeatureFlag. Disabled →
 *     centered empty state.
 *
 * Week model is Monday–Sunday; `work_date` is compared exclusively as a
 * YYYY-MM-DD date-only string via the house helpers (weekUtils → scheduleNotes).
 * Filters render through EntityFilterBar (Rule 33) — this page owns the typed
 * DispatchFilterState and adapts it to the bar's value bag; filtering is
 * client-side (workers filter hides rows, projects filter hides chips).
 * No realtime (Gotcha #53), no notifications, no localStorage.
 */

import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { useRoles } from "@/contexts/RoleContext";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";
import { formatDateOnly } from "@/utils/scheduleNotes";
import {
  addDays,
  formatWeekLabel,
  getWeekDayISOs,
  getWeekStart,
} from "@/components/dispatch/weekUtils";
import {
  CrewAssignment,
  DispatchFilterState,
  DispatchProject,
  EMPTY_DISPATCH_FILTERS,
} from "@/components/dispatch/dispatchTypes";
import {
  useDispatchMutations,
  useDispatchProjects,
  useDispatchRoster,
  useReferencedProjects,
  useWeekAssignments,
} from "@/components/dispatch/useDispatchData";
import { DispatchGrid } from "@/components/dispatch/DispatchGrid";
import {
  AssignmentSheet,
  AssignmentSheetState,
} from "@/components/dispatch/AssignmentSheet";
import { CopyWeekDialog } from "@/components/dispatch/CopyWeekDialog";

export default function DispatchBoard() {
  const { isAdmin, isManager, loading: rolesLoading } = useRoles();
  const { enabled: flagEnabled, isLoading: flagLoading } =
    useDbFeatureFlag("crew_dispatch_board");

  const canManage = isAdmin || isManager;
  const boardActive = canManage && flagEnabled;

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [filters, setFilters] = useState<DispatchFilterState>(EMPTY_DISPATCH_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState<AssignmentSheetState | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const weekStartISO = formatDateOnly(weekStart);
  const weekEndISO = formatDateOnly(addDays(weekStart, 6));
  const weekDayISOs = useMemo(() => getWeekDayISOs(weekStart), [weekStart]);

  const rosterQuery = useDispatchRoster({ enabled: boardActive });
  const projectsQuery = useDispatchProjects({ enabled: boardActive });
  const assignmentsQuery = useWeekAssignments(weekStartISO, weekEndISO, {
    enabled: boardActive,
  });

  const roster = useMemo(() => rosterQuery.data ?? [], [rosterQuery.data]);
  const pickerProjects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data]
  );
  const assignments = useMemo(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data]
  );

  const referencedQuery = useReferencedProjects(assignments, pickerProjects, {
    enabled: boardActive,
  });

  const projectsById = useMemo(() => {
    const map = new Map<string, DispatchProject>();
    for (const p of pickerProjects) map.set(p.id, p);
    for (const p of referencedQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [pickerProjects, referencedQuery.data]);

  const mutations = useDispatchMutations(weekStartISO);

  /* ------------------------- filters (Rule 33 adapter) ------------------------ */

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        kind: "multiSelect",
        key: "workerIds",
        label: "Workers",
        searchable: true,
        searchPlaceholder: "Search workers...",
        options: roster.map((w) => ({ value: w.user_id, label: w.payee_name })),
      },
      {
        kind: "multiSelect",
        key: "projectIds",
        label: "Projects",
        searchable: true,
        searchPlaceholder: "Search projects...",
        options: Array.from(projectsById.values())
          .sort((a, b) =>
            b.project_number.localeCompare(a.project_number, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          )
          .map((p) => ({
            value: p.id,
            label: `${p.project_number} - ${p.project_name}`,
          })),
      },
    ],
    [roster, projectsById]
  );

  const filterValues: FilterValues = {
    workerIds: filters.workerIds,
    projectIds: filters.projectIds,
  };

  const handleFilterChange = (patch: FilterValues) =>
    setFilters((prev) => ({ ...prev, ...(patch as Partial<DispatchFilterState>) }));

  const visibleWorkers = useMemo(
    () =>
      filters.workerIds.length > 0
        ? roster.filter((w) => filters.workerIds.includes(w.user_id))
        : roster,
    [roster, filters.workerIds]
  );

  const visibleAssignments = useMemo(
    () =>
      filters.projectIds.length > 0
        ? assignments.filter((a) => filters.projectIds.includes(a.project_id))
        : assignments,
    [assignments, filters.projectIds]
  );

  const resultCount = useMemo(() => {
    const visibleUserIds = new Set(visibleWorkers.map((w) => w.user_id));
    return visibleAssignments.filter((a) => visibleUserIds.has(a.user_id)).length;
  }, [visibleAssignments, visibleWorkers]);

  /* -------------------------------- handlers -------------------------------- */

  const handleCreate = (userId: string, isoDate: string) => {
    setSheetState({ mode: "create", userId, workDate: isoDate });
    setSheetOpen(true);
  };

  const handleEdit = (assignment: CrewAssignment) => {
    setSheetState({ mode: "edit", assignment });
    setSheetOpen(true);
  };

  /* ---------------------------------- gates ---------------------------------- */

  if (!rolesLoading && !canManage) {
    return <Navigate to="/" replace />;
  }

  if (rolesLoading || flagLoading) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4 px-4 sm:px-0">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MobilePageWrapper>
    );
  }

  if (!flagEnabled) {
    return (
      <MobilePageWrapper>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">
            Crew Dispatch is not enabled for your account
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Ask an administrator to enable the crew dispatch board feature flag.
          </p>
        </div>
      </MobilePageWrapper>
    );
  }

  const isBoardLoading =
    rosterQuery.isLoading || projectsQuery.isLoading || assignmentsQuery.isLoading;

  return (
    <MobilePageWrapper>
      <div className="space-y-4 px-4 sm:px-0">
        <PageHeader
          icon={CalendarClock}
          title="Crew Dispatch"
          description="Assign crew members to projects by day"
        />

        {/* Week navigation + copy-last-week split button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous week"
              onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setWeekStart(getWeekStart(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Next week"
              onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-semibold">{formatWeekLabel(weekStart)}</span>

          <div className="ml-auto flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-r-none"
              onClick={() => setCopyOpen(true)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy last week
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none border-l-0"
                  aria-label="More dispatch actions"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCopyOpen(true)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy last week
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <EntityFilterBar
          entityName="Assignments"
          fields={filterFields}
          values={filterValues}
          onChange={handleFilterChange}
          onClearAll={() => setFilters(EMPTY_DISPATCH_FILTERS)}
          resultCount={resultCount}
        />

        {isBoardLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : roster.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border py-16 text-center">
            <p className="text-sm font-medium">No dispatchable workers</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Workers appear here when their payee record provides labor, is
              active, and is linked to a user account (Role Management → Expense
              &amp; time setup).
            </p>
          </div>
        ) : (
          <DispatchGrid
            weekDayISOs={weekDayISOs}
            workers={visibleWorkers}
            assignments={visibleAssignments}
            projectsById={projectsById}
            isAdmin={isAdmin}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onMove={mutations.moveAssignment}
            onDelete={mutations.deleteAssignment}
          />
        )}
      </div>

      <AssignmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        state={sheetState}
        workers={roster}
        pickerProjects={pickerProjects}
        projectsById={projectsById}
        assignments={assignments}
        isAdmin={isAdmin}
        onSave={mutations.saveAssignment}
        onDelete={mutations.deleteAssignment}
      />

      <CopyWeekDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        weekStart={weekStart}
        workers={roster}
        projectsById={projectsById}
      />
    </MobilePageWrapper>
  );
}
