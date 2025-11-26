import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Quote } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { EstimateSelector } from "./EstimateSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DuplicateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  estimates: Estimate[];
  onSuccess: (newQuoteId: string) => void;
}

export const DuplicateQuoteModal = ({
  open,
  onOpenChange,
  quote,
  estimates,
  onSuccess
}: DuplicateQuoteModalProps) => {
  const { toast } = useToast();
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate>();
  const [duplicating, setDuplicating] = useState(false);

  // Filter estimates to same project only
  const sameProjectEstimates = estimates.filter(
    est => est.project_id === quote.project_id && est.id !== quote.estimate_id
  );

  const handleDuplicate = async () => {
    if (!selectedEstimate) {
      toast({
        title: "Error",
        description: "Please select an estimate version",
        variant: "destructive"
      });
      return;
    }

    setDuplicating(true);
    try {
      const { data, error } = await supabase.rpc('duplicate_quote_for_estimate', {
        source_quote_id: quote.id,
        target_estimate_id: selectedEstimate.id
      });

      if (error) throw error;

      toast({
        title: "Quote Duplicated",
        description: "Quote has been duplicated. Please review and link line items to the new estimate."
      });

      onOpenChange(false);
      onSuccess(data);
    } catch (error) {
      console.error('Error duplicating quote:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to duplicate quote",
        variant: "destructive"
      });
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Quote for Different Estimate
          </SheetTitle>
          <SheetDescription>
            Create a copy of this quote for a different estimate version in the same project.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Source Quote Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="text-sm font-medium">Source Quote</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">Quote #</div>
                <div className="font-mono">{quote.quoteNumber}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Payee</div>
                <div>{quote.quotedBy}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Amount</div>
                <div className="font-mono">{formatCurrency(quote.total)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Line Items</div>
                <div>{quote.lineItems.length}</div>
              </div>
            </div>
          </div>

          {/* Target Estimate Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Target Estimate Version
            </label>
            <EstimateSelector
              estimates={sameProjectEstimates}
              selectedEstimate={selectedEstimate}
              onSelect={setSelectedEstimate}
              placeholder="Choose estimate version..."
            />
            {sameProjectEstimates.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No other estimate versions found in this project. Create another estimate version first.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Important Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Creates an exact copy of this quote for the selected estimate version.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={duplicating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={!selectedEstimate || duplicating || sameProjectEstimates.length === 0}
          >
            {duplicating ? "Duplicating..." : "Duplicate Quote"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
