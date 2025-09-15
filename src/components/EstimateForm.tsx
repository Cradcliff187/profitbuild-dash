import { useState, useEffect } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineItemRow } from "./LineItemRow";
import { Estimate, LineItem, LineItemCategory } from "@/types/estimate";
import { useToast } from "@/hooks/use-toast";

interface EstimateFormProps {
  onSave: (estimate: Estimate) => void;
  onCancel: () => void;
}

export const EstimateForm = ({ onSave, onCancel }: EstimateFormProps) => {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subtotals, setSubtotals] = useState({
    labor: 0,
    materials: 0,
    equipment: 0,
    other: 0
  });
  const [total, setTotal] = useState(0);

  const generateEstimateNumber = () => {
    return `EST-${Date.now().toString().slice(-6)}`;
  };

  const createNewLineItem = (category: LineItemCategory = 'Labor'): LineItem => ({
    id: Date.now().toString() + Math.random(),
    category,
    description: '',
    quantity: 0,
    rate: 0,
    total: 0
  });

  useEffect(() => {
    // Add initial line item
    if (lineItems.length === 0) {
      setLineItems([createNewLineItem()]);
    }
  }, []);

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

  const handleSave = () => {
    if (!projectName.trim() || !client.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in project name and client.",
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

    const estimate: Estimate = {
      id: Date.now().toString(),
      projectName: projectName.trim(),
      client: client.trim(),
      date,
      estimateNumber: generateEstimateNumber(),
      lineItems: lineItems.filter(item => item.description.trim()),
      subtotals,
      total,
      createdAt: new Date()
    };

    onSave(estimate);
    toast({
      title: "Estimate Saved",
      description: `Estimate ${estimate.estimateNumber} has been created successfully.`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Estimate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date</Label>
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
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
                    <span>Estimate Total:</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Estimate
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