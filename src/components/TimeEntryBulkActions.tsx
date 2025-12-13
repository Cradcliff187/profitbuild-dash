import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";

interface TimeEntryBulkActionsProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const TimeEntryBulkActions = ({
  selectedCount,
  onApprove,
  onReject,
  onDelete,
  onCancel,
}: TimeEntryBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-muted border rounded-md">
      <span className="text-xs font-medium flex-shrink-0">
        {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
      </span>
      <div className="flex flex-wrap gap-1.5 sm:ml-auto">
        <Button size="sm" variant="default" onClick={onApprove} className="flex-1 sm:flex-initial">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} className="flex-1 sm:flex-initial">
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} className="flex-1 sm:flex-initial">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="flex-1 sm:flex-initial">
          Cancel
        </Button>
      </div>
    </div>
  );
};
