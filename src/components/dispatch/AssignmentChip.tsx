/**
 * Draggable assignment chip inside a dispatch cell.
 * Click opens the edit sheet — stopPropagation so the cell's create-click
 * never fires underneath (Gotcha #25 class).
 */

import { Draggable } from "@hello-pangea/dnd";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CrewAssignment, DispatchProject, formatStartTime } from "./dispatchTypes";

interface AssignmentChipProps {
  assignment: CrewAssignment;
  project?: DispatchProject;
  index: number;
  onEdit: (assignment: CrewAssignment) => void;
}

export function AssignmentChip({ assignment, project, index, onEdit }: AssignmentChipProps) {
  const startTime = formatStartTime(assignment.start_time);
  const notePreview = assignment.task_note?.split("\n")[0]?.trim();

  return (
    <Draggable draggableId={assignment.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(assignment);
          }}
          title={
            project
              ? `${project.project_number} - ${project.project_name}`
              : undefined
          }
          className={cn(
            "rounded-md border border-l-2 border-l-primary bg-card px-2 py-1.5 text-xs shadow-sm",
            "cursor-grab select-none space-y-0.5 transition-colors hover:bg-accent",
            snapshot.isDragging && "shadow-md ring-2 ring-primary/40"
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold">
              {project?.project_number ?? "Unknown"}
            </span>
            {startTime && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {startTime}
              </span>
            )}
          </div>
          {notePreview && (
            <p className="truncate text-muted-foreground">{notePreview}</p>
          )}
        </div>
      )}
    </Draggable>
  );
}
