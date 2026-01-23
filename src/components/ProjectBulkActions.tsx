import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowUpDown } from "lucide-react";
import { ProjectStatus, PROJECT_STATUSES } from "@/types/project";

interface ProjectBulkActionsProps {
  selectedCount: number;
  onStatusUpdate: (status: ProjectStatus) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const ProjectBulkActions = ({
  selectedCount,
  onStatusUpdate,
  onDelete,
  onCancel,
}: ProjectBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-muted border rounded-md">
      <span className="text-xs font-medium">
        {selectedCount} {selectedCount === 1 ? 'project' : 'projects'} selected
      </span>
      <div className="flex gap-1.5 ml-auto">
        <Select onValueChange={(value) => onStatusUpdate(value as ProjectStatus)}>
          <SelectTrigger className="h-7 w-[140px] text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Update Status" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={onDelete}>
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
