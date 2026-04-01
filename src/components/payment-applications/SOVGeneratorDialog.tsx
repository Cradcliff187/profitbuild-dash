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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Estimate } from "@/types/estimate";

interface SOVGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimates: Estimate[];
  onGenerate: (estimateId: string, retainagePercent: number) => void;
  isGenerating: boolean;
}

export function SOVGeneratorDialog({
  open,
  onOpenChange,
  estimates,
  onGenerate,
  isGenerating,
}: SOVGeneratorDialogProps) {
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>("");
  const [retainagePercent, setRetainagePercent] = useState<number>(10);

  const approvedEstimates = estimates.filter(
    (e) => e.status === "approved" && e.is_current_version !== false
  );

  const handleGenerate = () => {
    if (!selectedEstimateId) return;
    onGenerate(selectedEstimateId, retainagePercent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Schedule of Values</DialogTitle>
          <DialogDescription>
            Create a billing Schedule of Values from an approved estimate. This
            will be the basis for all payment applications on this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="estimate">Source Estimate</Label>
            <Select value={selectedEstimateId} onValueChange={setSelectedEstimateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an approved estimate" />
              </SelectTrigger>
              <SelectContent>
                {approvedEstimates.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No approved estimates available
                  </SelectItem>
                ) : (
                  approvedEstimates.map((est) => (
                    <SelectItem key={est.id} value={est.id}>
                      {est.estimate_number} — $
                      {(est.total_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retainage">Retainage Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="retainage"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={retainagePercent}
                onChange={(e) => setRetainagePercent(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Standard construction retainage is 5-10%. This applies to all line
              items unless individually overridden.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedEstimateId || isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate SOV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
