import { useState, useEffect } from "react";
import { Save, Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ProjectSelector } from "./ProjectSelector";
import { LineItemRow } from "./LineItemRow";
import { Estimate, LineItem } from "@/types/estimate";
import { Quote, QuoteLineItem } from "@/types/quote";
import { useToast } from "@/hooks/use-toast";

interface QuoteFormProps {
  estimates: Estimate[];
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

export const QuoteForm = ({ estimates, onSave, onCancel }: QuoteFormProps) => {
  const { toast } = useToast();
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate>();
  const [quotedBy, setQuotedBy] = useState("");
  const [dateReceived, setDateReceived] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [subtotals, setSubtotals] = useState({
    labor: 0,
    materials: 0,
    equipment: 0,
    other: 0
  });
  const [total, setTotal] = useState(0);

  const generateQuoteNumber = () => {
    return `QTE-${Date.now().toString().slice(-6)}`;
  };

  const createQuoteLineItemFromEstimate = (estimateItem: LineItem): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    estimateLineItemId: estimateItem.id,
    category: estimateItem.category,
    description: estimateItem.description,
    quantity: estimateItem.quantity,
    rate: 0, // Reset rate for quote entry
    total: 0
  });

  const createNewQuoteLineItem = (): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    category: 'Labor',
    description: '',
    quantity: 0,
    rate: 0,
    total: 0
  });

  useEffect(() => {
    if (selectedEstimate) {
      // Pre-populate line items from selected estimate
      const quoteLineItems = selectedEstimate.lineItems.map(createQuoteLineItemFromEstimate);
      setLineItems(quoteLineItems);
    }
  }, [selectedEstimate]);

  useEffect(() => {
    // Calculate totals whenever line items change
    const newSubtotals = {
      labor: 0,
      materials: 0,
      equipment: 0,
      other: 0
    };

    lineItems.forEach(item => {
      const itemTotal = item.quantity * item.rate;
      switch (item.category) {
        case 'Labor':
          newSubtotals.labor += itemTotal;
          break;
        case 'Materials':
          newSubtotals.materials += itemTotal;
          break;
        case 'Equipment':
          newSubtotals.equipment += itemTotal;
          break;
        case 'Other':
          newSubtotals.other += itemTotal;
          break;
      }
    });

    setSubtotals(newSubtotals);
    setTotal(Object.values(newSubtotals).reduce((sum, val) => sum + val, 0));
  }, [lineItems]);

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updated.total = updated.quantity * updated.rate;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, createNewQuoteLineItem()]);
  };

  const handleSave = () => {
    if (!selectedEstimate) {
      toast({
        title: "Missing Project",
        description: "Please select a project estimate.",
        variant: "destructive"
      });
      return;
    }

    if (!quotedBy.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the subcontractor name.",
        variant: "destructive"
      });
      return;
    }

    if (lineItems.every(item => !item.description.trim())) {
      toast({
        title: "Missing Line Items",
        description: "Please add at least one line item with a description.",
        variant: "destructive"
      });
      return;
    }

    const quote: Quote = {
      id: Date.now().toString(),
      estimateId: selectedEstimate.id,
      projectName: selectedEstimate.projectName,
      client: selectedEstimate.client,
      quotedBy: quotedBy.trim(),
      dateReceived,
      quoteNumber: generateQuoteNumber(),
      lineItems: lineItems.filter(item => item.description.trim()),
      subtotals,
      total,
      notes: notes.trim() || undefined,
      createdAt: new Date()
    };

    onSave(quote);
    toast({
      title: "Quote Saved",
      description: `Quote ${quote.quoteNumber} from ${quote.quotedBy} has been created successfully.`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Quote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Select Project Estimate</Label>
            <ProjectSelector
              estimates={estimates}
              selectedEstimate={selectedEstimate}
              onSelect={setSelectedEstimate}
              placeholder="Choose a project to quote..."
            />
            {selectedEstimate && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-medium">{selectedEstimate.projectName}</div>
                <div className="text-muted-foreground">
                  Client: {selectedEstimate.client} • 
                  Estimate Total: ${selectedEstimate.total.toFixed(2)} • 
                  {selectedEstimate.estimateNumber}
                </div>
              </div>
            )}
          </div>

          {/* Quote Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotedBy">Subcontractor Name</Label>
              <Input
                id="quotedBy"
                value={quotedBy}
                onChange={(e) => setQuotedBy(e.target.value)}
                placeholder="Enter subcontractor name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateReceived && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateReceived ? format(dateReceived, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateReceived}
                    onSelect={(date) => date && setDateReceived(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedEstimate && (
            <>
              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Quote Line Items</h3>
                  <Button onClick={addLineItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </div>

                {/* Line Items Header */}
                <div className="grid grid-cols-12 gap-4 p-2 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Category</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Rate</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  {lineItems.map(lineItem => (
                    <LineItemRow
                      key={lineItem.id}
                      lineItem={lineItem}
                      onUpdate={updateLineItem}
                      onRemove={removeLineItem}
                    />
                  ))}
                </div>
              </div>

              {/* Totals */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Labor:</span>
                        <span className="font-medium">${subtotals.labor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Materials:</span>
                        <span className="font-medium">${subtotals.materials.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipment:</span>
                        <span className="font-medium">${subtotals.equipment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other:</span>
                        <span className="font-medium">${subtotals.other.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Quote Total:</span>
                        <span className="text-primary">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this quote..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={!selectedEstimate}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Quote
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};