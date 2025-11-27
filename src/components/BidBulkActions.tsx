import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BidBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export const BidBulkActions = ({
  selectedCount,
  onDelete,
  onCancel,
}: BidBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-muted border rounded-md">
      <span className="text-xs font-medium">
        {selectedCount} {selectedCount === 1 ? 'bid' : 'bids'} selected
      </span>
      <div className="flex gap-1.5 ml-auto">
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
