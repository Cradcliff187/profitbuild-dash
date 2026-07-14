/**
 * One worker × day cell on the dispatch grid. Droppable id is `${userId}|${isoDate}`
 * (both parts are `|`-free: uuid + YYYY-MM-DD). Clicking the cell background or
 * its subtle "+" opens the create sheet prefilled with this user + date; chips
 * stop propagation and open the edit sheet instead.
 */

import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CrewAssignment, DispatchProject, cellDroppableId } from "./dispatchTypes";
import { AssignmentChip } from "./AssignmentChip";

interface DispatchCellProps {
  userId: string;
  isoDate: string;
  assignments: CrewAssignment[];
  projectsById: Map<string, DispatchProject>;
  isToday: boolean;
  onCreate: (userId: string, isoDate: string) => void;
  onEdit: (assignment: CrewAssignment) => void;
}

export function DispatchCell({
  userId,
  isoDate,
  assignments,
  projectsById,
  isToday,
  onCreate,
  onEdit,
}: DispatchCellProps) {
  return (
    <Droppable droppableId={cellDroppableId(userId, isoDate)}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          onClick={() => onCreate(userId, isoDate)}
          className={cn(
            "group/cell flex min-h-[76px] cursor-pointer flex-col gap-1 border-b border-r p-1 transition-colors",
            isToday && "bg-primary/[0.03]",
            snapshot.isDraggingOver && "bg-primary/10"
          )}
        >
          {assignments.map((assignment, index) => (
            <AssignmentChip
              key={assignment.id}
              assignment={assignment}
              project={projectsById.get(assignment.project_id)}
              index={index}
              onEdit={onEdit}
            />
          ))}
          {provided.placeholder}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreate(userId, isoDate);
            }}
            aria-label="Add assignment"
            className={cn(
              "mt-auto flex h-6 w-full items-center justify-center rounded text-muted-foreground/50",
              "opacity-0 transition-opacity hover:bg-accent hover:text-muted-foreground",
              "focus-visible:opacity-100 group-hover/cell:opacity-100"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Droppable>
  );
}
