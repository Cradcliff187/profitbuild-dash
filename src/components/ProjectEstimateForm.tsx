import { useState, useEffect } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineItemRow } from "./LineItemRow";
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Project } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectEstimateFormProps {
  project: Project;
  onSave: (estimate: Estimate) => void;
  onCancel: () => void;
}

export const ProjectEstimateForm = ({ project, onSave, onCancel }: ProjectEstimateFormProps) => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [validUntil, setValidUntil] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [contingencyPercent, setContingencyPercent] = useState(10.0);
  const [contingencyUsed, setContingencyUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const generateEstimateNumber = () => {
    return `EST-${project.project_number}-${Date.now().toString().slice(-4)}`;
  };

  const createNewLineItem = (category: LineItemCategory = 'labor_internal'): LineItem => ({
    id: Date.now().toString() + Math.random(),
    category,
    description: '',
    quantity: 1,
    rate: 0,
    total: 0,
    unit: '',
    sort_order: lineItems.length
  });

  useEffect(() => {
    // Add initial line item
    if (lineItems.length === 0) {
      setLineItems([createNewLineItem()]);
    }
  }, []);

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate total for this line item
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
    setLineItems(prev => [...prev, createNewLineItem()]);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateContingencyAmount = () => {
    const total = calculateTotal();
    return total * (contingencyPercent / 100);
  };

  const handleSave = async () => {
    const validLineItems = lineItems.filter(item => item.description.trim());
    
    if (validLineItems.length === 0) {
      toast({
        title: "Missing Line Items",
        description: "Please add at least one line item with a description.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const estimateNumber = generateEstimateNumber();
      const totalAmount = calculateTotal();
      
      // Create estimate
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          project_id: project.id,
          estimate_number: estimateNumber,
          date_created: date.toISOString().split('T')[0],
          total_amount: totalAmount,
          status: 'draft' as const,
          notes: notes.trim() || undefined,
          valid_until: validUntil?.toISOString().split('T')[0],
          contingency_percent: contingencyPercent,
          contingency_used: contingencyUsed,
          revision_number: 1
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Create line items
      const lineItemsData = validLineItems.map((item, index) => ({
        estimate_id: estimateData.id,
        category: item.category,
        description: item.description.trim(),
        quantity: item.quantity,
        rate: item.rate,
        total: item.quantity * item.rate,
        unit: item.unit || undefined,
        sort_order: index
      }));

      const { error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      const newEstimate: Estimate = {
        id: estimateData.id,
        project_id: estimateData.project_id,
        estimate_number: estimateData.estimate_number,
        date_created: new Date(estimateData.date_created),
        total_amount: estimateData.total_amount,
        status: estimateData.status as any,
        notes: estimateData.notes,
        valid_until: estimateData.valid_until ? new Date(estimateData.valid_until) : undefined,
        revision_number: estimateData.revision_number,
        contingency_percent: estimateData.contingency_percent,
        contingency_amount: estimateData.contingency_amount,
        contingency_used: estimateData.contingency_used,
        lineItems: validLineItems,
        created_at: new Date(estimateData.created_at),
        updated_at: new Date(estimateData.updated_at),
        project_name: project.project_name,
        client_name: project.client_name
      };

      onSave(newEstimate);
      
      toast({
        title: "Estimate Created",
        description: `Estimate ${estimateNumber} has been created successfully.`
      });

    } catch (error) {
      console.error('Error creating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to create estimate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Estimate for {project.project_name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Project: {project.project_number} • Client: {project.client_name}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estimate Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estimate Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Valid Until (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !validUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={setValidUntil}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
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
                <div key={lineItem.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2">
                    <Select
                      value={lineItem.category}
                      onValueChange={(value: LineItemCategory) => updateLineItem(lineItem.id, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_DISPLAY_MAP).map(([key, display]) => (
                          <SelectItem key={key} value={key}>
                            {display}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-4">
                    <Input
                      value={lineItem.description}
                      onChange={(e) => updateLineItem(lineItem.id, 'description', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={lineItem.quantity}
                      onChange={(e) => updateLineItem(lineItem.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={lineItem.rate}
                      onChange={(e) => updateLineItem(lineItem.id, 'rate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="col-span-1 text-right font-medium">
                    ${(lineItem.quantity * lineItem.rate).toFixed(2)}
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(lineItem.id)}
                      disabled={lineItems.length <= 1}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contingency Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contingency-percent">Contingency %</Label>
              <Input
                id="contingency-percent"
                type="number"
                step="0.1"
                value={contingencyPercent}
                onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contingency-used">Contingency Used</Label>
              <Input
                id="contingency-used"
                type="number"
                step="0.01"
                value={contingencyUsed}
                onChange={(e) => setContingencyUsed(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Total */}
          <div className="space-y-4">
            <div className="text-right space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">
                  ${calculateTotal().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Contingency ({contingencyPercent}%)</div>
                <div className="text-lg font-semibold">
                  ${calculateContingencyAmount().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="text-sm text-muted-foreground">Total with Contingency</div>
                <div className="text-2xl font-bold text-primary">
                  ${(calculateTotal() + calculateContingencyAmount()).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Creating..." : "Create Estimate"}
            </Button>
            <Button onClick={onCancel} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};