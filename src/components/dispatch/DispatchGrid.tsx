/**
 * The dispatch board grid: workers as rows, 7 Monday–Sunday day columns.
 *
 * Owns the DragDropContext. Drag chip → another cell = optimistic move
 * (user_id/work_date update, start_time/task_note kept). While dragging, a
 * fixed bottom-center "Remove" drop zone appears — dropping there deletes
 * (admin) or explains that managers can't delete (RLS: DELETE is admin-only).
 *
 * The remove zone is ALWAYS mounted at its fixed position and only fades in
 * via opacity — @hello-pangea/dnd captures droppable geometry at drag start,
 * so a display:none / translated-offscreen zone would register the wrong rect.
 *
 * Desktop-first, but the outer overflow-x-auto container with a min-width grid
 * keeps it usable (horizontally scrollable) down to 390px.
 */

import { useMemo, useState } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateOnly, parseDateOnly } from "@/utils/scheduleNotes";
import {
  CrewAssignment,
  DispatchProject,
  DispatchWorker,
  cellDroppableId,
  parseCellDroppableId,
  sortAssignments,
} from "./dispatchTypes";
import { DispatchCell } from "./DispatchCell";

const REMOVE_DROPPABLE_ID = "remove-zone";

interface DispatchGridProps {
  weekDayISOs: string[];
  workers: DispatchWorker[];
  assignments: CrewAssignment[];
  projectsById: Map<string, DispatchProject>;
  isAdmin: boolean;
  onCreate: (userId: string, isoDate: string) => void;
  onEdit: (assignment: CrewAssignment) => void;
  onMove: (assignmentId: string, toUserId: string, toDateISO: string) => void;
  onDelete: (assignmentId: string) => void;
}

export function DispatchGrid({
  weekDayISOs,
  workers,
  assignments,
  projectsById,
  isAdmin,
  onCreate,
  onEdit,
  onMove,
  onDelete,
}: DispatchGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const todayISO = formatDateOnly(new Date());

  // Cell buckets keyed by the same `${userId}|${isoDate}` id the droppables use.
  const assignmentsByCell = useMemo(() => {
    const map = new Map<string, CrewAssignment[]>();
    for (const assignment of assignments) {
      const key = cellDroppableId(assignment.user_id, assignment.work_date);
      const bucket = map.get(key);
      if (bucket) bucket.push(assignment);
      else map.set(key, [assignment]);
    }
    for (const [key, bucket] of map) {
      map.set(key, sortAssignments(bucket));
    }
    return map;
  }, [assignments]);

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (destination.droppableId === REMOVE_DROPPABLE_ID) {
      if (isAdmin) {
        onDelete(draggableId);
      } else {
        toast.error("Only admins can remove assignments", {
          description:
            "Managers can create and move assignments, but deleting requires an admin.",
        });
      }
      return;
    }

    if (destination.droppableId === source.droppableId) return;

    const target = parseCellDroppableId(destination.droppableId);
    if (!target) return;
    onMove(draggableId, target.userId, target.isoDate);
  };

  return (
    <DragDropContext
      onBeforeCapture={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-[960px]"
          style={{ gridTemplateColumns: "150px repeat(7, minmax(112px, 1fr))" }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-20 border-b border-r bg-muted/50 px-2 py-2 text-xs font-semibold text-muted-foreground">
            Worker
          </div>
          {weekDayISOs.map((iso) => {
            const day = parseDateOnly(iso);
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                className={cn(
                  "border-b border-r px-2 py-2 text-center",
                  isToday ? "bg-primary/[0.06]" : "bg-muted/50"
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {format(day, "EEE")}
                </p>
                <p
                  className={cn(
                    "text-xs tabular-nums",
                    isToday ? "font-bold text-primary" : "text-foreground"
                  )}
                >
                  {format(day, "MMM d")}
                </p>
              </div>
            );
          })}

          {/* Worker rows */}
          {workers.map((worker) => (
            <WorkerRow
              key={worker.user_id}
              worker={worker}
              weekDayISOs={weekDayISOs}
              todayISO={todayISO}
              assignmentsByCell={assignmentsByCell}
              projectsById={projectsById}
              onCreate={onCreate}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>

      {/* Remove drop zone — always mounted (geometry captured at drag start),
          faded in only while dragging. */}
      <Droppable droppableId={REMOVE_DROPPABLE_ID}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex h-12 -translate-x-1/2 items-center gap-2 overflow-hidden",
              "rounded-full border px-5 text-sm font-medium shadow-lg transition-all",
              isDragging ? "opacity-100" : "pointer-events-none opacity-0",
              snapshot.isDraggingOver
                ? "scale-105 border-destructive bg-destructive text-destructive-foreground"
                : "border-destructive/40 bg-background text-destructive"
            )}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">
              {isAdmin ? "Drop here to remove" : "Remove (admin only)"}
            </span>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

interface WorkerRowProps {
  worker: DispatchWorker;
  weekDayISOs: string[];
  todayISO: string;
  assignmentsByCell: Map<string, CrewAssignment[]>;
  projectsById: Map<string, DispatchProject>;
  onCreate: (userId: string, isoDate: string) => void;
  onEdit: (assignment: CrewAssignment) => void;
}

function WorkerRow({
  worker,
  weekDayISOs,
  todayISO,
  assignmentsByCell,
  projectsById,
  onCreate,
  onEdit,
}: WorkerRowProps) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center border-b border-r bg-background px-2 py-2">
        <span className="truncate text-xs font-medium" title={worker.payee_name}>
          {worker.payee_name}
        </span>
      </div>
      {weekDayISOs.map((iso) => (
        <DispatchCell
          key={iso}
          userId={worker.user_id}
          isoDate={iso}
          assignments={
            assignmentsByCell.get(cellDroppableId(worker.user_id, iso)) ?? []
          }
          projectsById={projectsById}
          isToday={iso === todayISO}
          onCreate={onCreate}
          onEdit={onEdit}
        />
      ))}
    </>
  );
}
