import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineItem, LineItemCategory } from "@/types/estimate";

interface LineItemRowProps {
  lineItem: LineItem;
  onUpdate: (id: string, field: keyof LineItem, value: any) => void;
  onRemove: (id: string) => void;
}

const categoryColors = {
  "Labor (Internal)": "border-l-blue-500",
  "Subcontractors": "border-l-amber-500",
  Materials: "border-l-green-500", 
  Equipment: "border-l-orange-500",
  Other: "border-l-purple-500"
};

export const LineItemRow = ({ lineItem, onUpdate, onRemove }: LineItemRowProps) => {
  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    onUpdate(lineItem.id, 'quantity', quantity);
  };

  const handleRateChange = (value: string) => {
    const rate = parseFloat(value) || 0;
    onUpdate(lineItem.id, 'rate', rate);
  };

  return (
    <div className={`grid grid-cols-12 gap-4 p-4 border rounded-lg border-l-4 ${categoryColors[lineItem.category]} bg-card`}>
      <div className="col-span-2">
        <Select value={lineItem.category} onValueChange={(value: LineItemCategory) => onUpdate(lineItem.id, 'category', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Labor (Internal)">Labor (Internal)</SelectItem>
            <SelectItem value="Subcontractors">Subcontractors</SelectItem>
            <SelectItem value="Materials">Materials</SelectItem>
            <SelectItem value="Equipment">Equipment</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="col-span-4">
        <Input
          placeholder="Description"
          value={lineItem.description}
          onChange={(e) => onUpdate(lineItem.id, 'description', e.target.value)}
        />
      </div>
      
      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Qty"
          value={lineItem.quantity || ''}
          onChange={(e) => handleQuantityChange(e.target.value)}
          min="0"
          step="0.01"
        />
      </div>
      
      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Rate"
          value={lineItem.rate || ''}
          onChange={(e) => handleRateChange(e.target.value)}
          min="0"
          step="0.01"
        />
      </div>
      
      <div className="col-span-1 flex items-center justify-end font-semibold text-foreground">
        ${lineItem.total.toFixed(2)}
      </div>
      
      <div className="col-span-1 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(lineItem.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};