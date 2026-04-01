import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreatePaymentAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateApp: (periodFrom: string, periodTo: string) => void;
  isCreating: boolean;
  nextAppNumber: number;
}

export function CreatePaymentAppDialog({
  open,
  onOpenChange,
  onCreateApp,
  isCreating,
  nextAppNumber,
}: CreatePaymentAppDialogProps) {
  const today = new Date().toISOString().split("T")[0];
  const [periodFrom, setPeriodFrom] = useState(today);
  const [periodTo, setPeriodTo] = useState(today);

  const handleCreate = () => {
    if (!periodFrom || !periodTo) return;
    onCreateApp(periodFrom, periodTo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Create Payment Application #{nextAppNumber}
          </DialogTitle>
          <DialogDescription>
            Set the billing period for this payment application. Line items will
            be pre-populated from the Schedule of Values with cumulative progress
            from prior applications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-from">Period From</Label>
              <Input
                id="period-from"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-to">Period To</Label>
              <Input
                id="period-to"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!periodFrom || !periodTo || isCreating}
          >
            {isCreating ? "Creating..." : "Create Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
