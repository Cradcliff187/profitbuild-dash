import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface TimeEntryBulkActionsProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export const TimeEntryBulkActions = ({
  selectedCount,
  onApprove,
  onReject,
  onCancel,
}: TimeEntryBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted border rounded-md">
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
      </span>
      <div className="flex gap-2 ml-auto">
        <Button size="sm" variant="default" onClick={onApprove}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject}>
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
