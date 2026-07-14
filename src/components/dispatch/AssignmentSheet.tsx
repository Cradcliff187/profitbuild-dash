/**
 * Create/edit sheet for a crew day assignment (right-side Sheet, mirrors the
 * DocumentDetailsSheet header/scroll-body/footer anatomy).
 *
 * Schedule tie-in: once a project is selected, the project's schedulable lines
 * active on the chosen date render as "From schedule:" chips above the task
 * note — tapping one sets/appends the description into task_note (a SNAPSHOT;
 * we deliberately store text, not an FK). If nothing matches the date but the
 * project has schedulable lines, they all fold into a muted collapsed
 * "All schedule activities" section (they may simply be undated).
 *
 * Delete lives inside the sheet, admin-only (RLS: managers cannot delete),
 * confirmed via AlertDialog.
 */

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, ChevronDown, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";
import type { Project } from "@/types/project";
import { CrewAssignment, DispatchProject, DispatchWorker } from "./dispatchTypes";
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
  isAdmin,
  onSave,
  onDelete,
}: AssignmentSheetProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [workDate, setWorkDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [taskNote, setTaskNote] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
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
    } else {
      const a = state.assignment;
      setProjectId(a.project_id);
      setWorkDate(a.work_date);
      setStartTime(a.start_time ? a.start_time.slice(0, 5) : "");
      setTaskNote(a.task_note ?? "");
      setAdminNotes(a.admin_notes ?? "");
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

  const { allTasks, matchingTasks } = useProjectDayTasks(
    projectId || null,
    workDate || null
  );

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
      project_id: projectId,
      work_date: workDate,
      start_time: startTime ? startTime : null,
      task_note: taskNote.trim() ? taskNote.trim() : null,
      admin_notes: adminNotes.trim() ? adminNotes.trim() : null,
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

  const taskChip = (task: ProjectDayTask) => (
    <button
      key={task.id}
      type="button"
      onClick={() => setTaskNote((prev) => appendTaskText(prev, task.description))}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/5",
        "px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-primary/10"
      )}
      title={task.description}
    >
      <CalendarCheck2 className="h-3 w-3 shrink-0 text-primary" />
      <span className="truncate">{task.description}</span>
    </button>
  );

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
              {workerName}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label>Project</Label>
              {/* Cast to Project type — ProjectSelectorNew only reads id /
                  project_number / project_name; the dispatch projection
                  intentionally omits the other Project fields (house pattern,
                  see ReassignExpenseProjectDialog). */}
              <ProjectSelectorNew
                projects={selectorProjects as unknown as Project[]}
                selectedProject={selectedProject as unknown as Project | undefined}
                onSelect={(project) => setProjectId(project.id)}
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

          <footer className="flex shrink-0 items-center gap-2 border-t px-6 py-3">
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
