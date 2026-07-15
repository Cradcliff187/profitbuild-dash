/**
 * Create/edit sheet for a crew day assignment (right-side Sheet, mirrors the
 * DocumentDetailsSheet header/scroll-body/footer anatomy).
 *
 * Schedule tie-in: once a project is selected, the project's schedulable lines
 * active on the chosen date render as "From schedule:" chips above the task
 * note — tapping one sets/appends the description into task_note (a SNAPSHOT)
 * AND selects an OPTIONAL link to that activity (estimate_line_item_id /
 * change_order_line_item_id, at most one set). The link is what lets the DB
 * trigger auto-allocate the worker's time entries to the right line. The two
 * are independent: unlinking keeps the note text, and typing in the note never
 * changes the link. If nothing matches the date but the project has
 * schedulable lines, they all fold into a muted collapsed "All schedule
 * activities" section (they may simply be undated).
 *
 * Delete lives inside the sheet, admin-only (RLS: managers cannot delete),
 * confirmed via AlertDialog.
 */

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  ChevronDown,
  Link2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";
import type { Project } from "@/types/project";
import {
  CrewAssignment,
  DispatchProject,
  DispatchWorker,
  ScheduleTaskLink,
  assignmentTaskLink,
} from "./dispatchTypes";
import { SaveAssignmentInput } from "./useDispatchData";
import { useProjectDayTasks, ProjectDayTask } from "./useProjectDayTasks";

export type AssignmentSheetState =
  | { mode: "create"; userId: string; workDate: string }
  | { mode: "edit"; assignment: CrewAssignment };

interface AssignmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: AssignmentSheetState | null;
  workers: DispatchWorker[];
  pickerProjects: DispatchProject[];
  projectsById: Map<string, DispatchProject>;
  /**
   * The full (unfiltered) week's assignments — used for the crew picker's
   * "already at 225-xxx" availability hints. Informational only, never
   * blocking: multiple same-day assignments per worker are valid (split days).
   */
  assignments: CrewAssignment[];
  isAdmin: boolean;
  onSave: (input: SaveAssignmentInput) => Promise<boolean>;
  onDelete: (assignmentId: string) => Promise<boolean>;
}

/** Set when empty, append (newline) when not — skip if already present. */
function appendTaskText(current: string, addition: string): string {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) return current;
  if (!current.trim()) return trimmedAddition;
  if (current.includes(trimmedAddition)) return current;
  return `${current.trimEnd()}\n${trimmedAddition}`;
}

export function AssignmentSheet({
  open,
  onOpenChange,
  state,
  workers,
  pickerProjects,
  projectsById,
  assignments,
  isAdmin,
  onSave,
  onDelete,
}: AssignmentSheetProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [workDate, setWorkDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [taskNote, setTaskNote] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  /**
   * Selected schedule-activity link (or null = unlinked). Set ONLY by tapping
   * a schedule chip, cleared by the unlink button or by switching projects —
   * never by typing in the task note (the note is an independent snapshot).
   */
  const [linkedTask, setLinkedTask] = useState<ScheduleTaskLink | null>(null);
  /**
   * CREATE only: additional workers dispatched together with the primary
   * (clicked-cell) worker. Each gets their OWN row on save — there is
   * deliberately NO "crew" entity (per Chris, Jul 2026): per-row keeps
   * day-of edits, notifications, and auto-allocation individual.
   */
  const [extraWorkerIds, setExtraWorkerIds] = useState<string[]>([]);
  const [crewPickerOpen, setCrewPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isEdit = state?.mode === "edit";
  const assignment = isEdit ? state.assignment : null;
  const workerUserId = state
    ? state.mode === "create"
      ? state.userId
      : state.assignment.user_id
    : null;
  const workerName =
    workers.find((w) => w.user_id === workerUserId)?.payee_name ?? "Unknown worker";

  // Seed fields whenever the sheet opens for a new target.
  useEffect(() => {
    if (!open || !state) return;
    if (state.mode === "create") {
      setProjectId("");
      setWorkDate(state.workDate);
      setStartTime("");
      setTaskNote("");
      setAdminNotes("");
      setLinkedTask(null);
      setExtraWorkerIds([]);
      setCrewPickerOpen(false);
    } else {
      const a = state.assignment;
      setProjectId(a.project_id);
      setWorkDate(a.work_date);
      setStartTime(a.start_time ? a.start_time.slice(0, 5) : "");
      setTaskNote(a.task_note ?? "");
      setAdminNotes(a.admin_notes ?? "");
      setLinkedTask(assignmentTaskLink(a));
    }
  }, [open, state]);

  // Picker list: the dispatchable set, plus (when editing) the assignment's
  // project even if it fell out of the picker set (e.g. completed).
  const selectorProjects = useMemo(() => {
    if (projectId && !pickerProjects.some((p) => p.id === projectId)) {
      const referenced = projectsById.get(projectId);
      if (referenced) return [...pickerProjects, referenced];
    }
    return pickerProjects;
  }, [pickerProjects, projectsById, projectId]);

  const selectedProject = selectorProjects.find((p) => p.id === projectId);

  const { allTasks, matchingTasks, isLoading: tasksLoading } = useProjectDayTasks(
    projectId || null,
    workDate || null
  );

  // Crew picker candidates + availability hints ("already at 225-xxx" on the
  // currently selected date). Reacts to the date input; informational only —
  // same-day multi-assignment is valid (split days), so nothing is blocked.
  const crewCandidates = useMemo(() => {
    if (isEdit) return [];
    return workers
      .filter((w) => w.user_id !== workerUserId)
      .map((w) => {
        const sameDay = assignments.filter(
          (a) => a.user_id === w.user_id && a.work_date === workDate
        );
        const hint = sameDay
          .map(
            (a) =>
              projectsById.get(a.project_id)?.project_number ?? "another site"
          )
          .join(", ");
        return { ...w, hint };
      });
  }, [isEdit, workers, workerUserId, assignments, workDate, projectsById]);

  const toggleExtraWorker = (userId: string) => {
    setExtraWorkerIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Resolve the linked FK back to a task for display. `undefined` while the id
  // doesn't resolve — with lines deleted/superseded on versioning (Rule 27 /
  // Gotcha #65 class) the FK may point at a line no longer on the schedule.
  const resolvedLinkedTask = linkedTask
    ? allTasks.find((t) => t.id === linkedTask.id && t.source === linkedTask.source)
    : undefined;

  const handleSave = async () => {
    if (!workerUserId) return;
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    if (!workDate) {
      toast.error("Pick a date");
      return;
    }
    setIsSaving(true);
    const ok = await onSave({
      id: assignment?.id,
      user_id: workerUserId,
      additional_user_ids: isEdit ? undefined : extraWorkerIds,
      project_id: projectId,
      work_date: workDate,
      start_time: startTime ? startTime : null,
      task_note: taskNote.trim() ? taskNote.trim() : null,
      admin_notes: adminNotes.trim() ? adminNotes.trim() : null,
      task_link: linkedTask,
    });
    setIsSaving(false);
    if (ok) onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!assignment) return;
    setIsDeleting(true);
    const ok = await onDelete(assignment.id);
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
    if (ok) onOpenChange(false);
  };

  // Tapping a chip snapshots the description into task_note (as before) AND
  // selects the schedule link. Tapping the already-linked chip re-appends
  // nothing (appendTaskText dedups) and keeps the same link.
  const taskChip = (task: ProjectDayTask) => {
    const isSelected =
      linkedTask?.id === task.id && linkedTask?.source === task.source;
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => {
          setTaskNote((prev) => appendTaskText(prev, task.description));
          setLinkedTask({ id: task.id, source: task.source });
        }}
        aria-pressed={isSelected}
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-foreground transition-colors",
          isSelected
            ? "border-primary bg-primary/15 font-medium ring-1 ring-primary/40"
            : "border-primary/30 bg-primary/5 hover:bg-primary/10"
        )}
        title={task.description}
      >
        <CalendarCheck2 className="h-3 w-3 shrink-0 text-primary" />
        <span className="truncate">{task.description}</span>
      </button>
    );
  };

  const linkIsStale = !!linkedTask && !resolvedLinkedTask && !tasksLoading;
  const showLinkNudge = !!projectId && allTasks.length > 0 && !linkedTask;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6">
            <SheetTitle>{isEdit ? "Edit assignment" : "New assignment"}</SheetTitle>
            <SheetDescription>
              {isEdit || extraWorkerIds.length === 0
                ? workerName
                : `${workerName} + ${extraWorkerIds.length} more — each gets their own assignment`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Crew fan-out (create only): dispatch several people to the same
                place/time in one save. One ROW per worker — no crew entity —
                so day-of edits, pings, and auto-allocation stay individual. */}
            {!isEdit && (
              <div className="space-y-2">
                <Label>Crew</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium">
                    {workerName}
                  </span>
                  {extraWorkerIds.map((id) => {
                    const w = workers.find((x) => x.user_id === id);
                    if (!w) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium"
                      >
                        {w.payee_name}
                        <button
                          type="button"
                          onClick={() => toggleExtraWorker(id)}
                          aria-label={`Remove ${w.payee_name}`}
                          className="rounded-full p-0.5 hover:bg-primary/15"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                  {crewCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCrewPickerOpen((o) => !o)}
                      aria-expanded={crewPickerOpen}
                      className={cn(
                        "inline-flex min-h-[28px] items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors",
                        crewPickerOpen
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      <UserPlus className="h-3 w-3" />
                      Add crew
                    </button>
                  )}
                </div>
                {crewPickerOpen && (
                  <div className="divide-y rounded-lg border">
                    {crewCandidates.map((w) => (
                      <label
                        key={w.user_id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={extraWorkerIds.includes(w.user_id)}
                          onCheckedChange={() => toggleExtraWorker(w.user_id)}
                        />
                        <span className="flex-1 text-sm">{w.payee_name}</span>
                        {w.hint && (
                          <span className="text-xs text-muted-foreground">
                            already at {w.hint}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Project</Label>
              {/* Cast to Project type — ProjectSelectorNew only reads id /
                  project_number / project_name; the dispatch projection
                  intentionally omits the other Project fields (house pattern,
                  see ReassignExpenseProjectDialog). */}
              <ProjectSelectorNew
                projects={selectorProjects as unknown as Project[]}
                selectedProject={selectedProject as unknown as Project | undefined}
                onSelect={(project) => {
                  // Switching projects invalidates the schedule link — the
                  // linked line belongs to the previous project. The note
                  // snapshot text stays (it never implies the link).
                  if (project.id !== projectId) setLinkedTask(null);
                  setProjectId(project.id);
                }}
                placeholder="Select a project..."
                hideCreateButton
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="assignment-date">Date</Label>
                <Input
                  id="assignment-date"
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-start-time">Start time</Label>
                <Input
                  id="assignment-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-task-note">Task</Label>

              {projectId && matchingTasks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">From schedule:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingTasks.map(taskChip)}
                  </div>
                </div>
              )}

              {projectId && matchingTasks.length === 0 && allTasks.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-3 w-3" />
                    All schedule activities ({allTasks.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {allTasks.map(taskChip)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Link status row. Unlinking clears the FKs only — the task
                  note text is a snapshot and is deliberately kept. */}
              {linkedTask && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                    linkIsStale
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-primary/30 bg-primary/5"
                  )}
                >
                  <Link2
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0",
                      linkIsStale ? "text-amber-600" : "text-primary"
                    )}
                  />
                  <span className="min-w-0 flex-1 text-muted-foreground">
                    {resolvedLinkedTask ? (
                      <>
                        Linked to schedule activity —{" "}
                        <span className="text-foreground">
                          {resolvedLinkedTask.description}
                        </span>
                      </>
                    ) : tasksLoading ? (
                      "Linked to schedule activity"
                    ) : (
                      "Linked activity no longer on the schedule"
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinkedTask(null)}
                    aria-label="Unlink schedule activity"
                    title="Unlink (keeps the task note text)"
                    className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <Textarea
                id="assignment-task-note"
                value={taskNote}
                onChange={(e) => setTaskNote(e.target.value)}
                placeholder="What should they work on?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-admin-notes">
                Admin notes{" "}
                <span className="font-normal text-muted-foreground">
                  (never shown to field workers)
                </span>
              </Label>
              <Textarea
                id="assignment-admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes for admins/managers only"
                rows={2}
              />
            </div>
          </div>

          <footer className="shrink-0 space-y-2 border-t px-6 py-3">
            {/* Non-blocking nudge — the link is optional; saving unlinked is
                always allowed. */}
            {showLinkNudge && (
              <p className="text-xs text-muted-foreground">
                Tip: link a schedule activity so this worker's time
                auto-allocates to the right line.
              </p>
            )}
            <div className="flex items-center gap-2">
              {isEdit && isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mr-auto"
                  disabled={isSaving || isDeleting}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                className={cn(!(isEdit && isAdmin) && "ml-auto")}
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isDeleting}>
                {isSaving ? "Saving..." : isEdit ? "Save changes" : "Create"}
              </Button>
            </div>
          </footer>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {workerName} will no longer be dispatched to{" "}
              {selectedProject
                ? `${selectedProject.project_number} - ${selectedProject.project_name}`
                : "this project"}{" "}
              on {workDate}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
