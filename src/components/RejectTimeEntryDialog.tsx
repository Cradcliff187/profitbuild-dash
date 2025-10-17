import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  entryCount: number;
}

export const RejectTimeEntryDialog = ({
  open,
  onOpenChange,
  onConfirm,
  entryCount,
}: RejectTimeEntryDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reject {entryCount} {entryCount === 1 ? 'Entry' : 'Entries'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">
            Rejection Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Please provide a reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Reject {entryCount === 1 ? 'Entry' : 'Entries'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
