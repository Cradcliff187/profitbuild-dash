import { X, DollarSign, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

type MarkupType = 'percent' | 'amount';

export const LineItemRow = ({ lineItem, onUpdate, onRemove }: LineItemRowProps) => {
  const markupType: MarkupType = lineItem.markupPercent !== null ? 'percent' : 'amount';
  
  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    onUpdate(lineItem.id, 'quantity', quantity);
  };

  const handleCostChange = (value: string) => {
    const cost = parseFloat(value) || 0;
    onUpdate(lineItem.id, 'costPerUnit', cost);
  };

  const handleMarkupTypeChange = (type: MarkupType) => {
    if (type === 'percent') {
      onUpdate(lineItem.id, 'markupAmount', null);
      onUpdate(lineItem.id, 'markupPercent', 15); // Default 15%
    } else {
      onUpdate(lineItem.id, 'markupPercent', null);
      onUpdate(lineItem.id, 'markupAmount', 0);
    }
  };

  const handleMarkupValueChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (markupType === 'percent') {
      onUpdate(lineItem.id, 'markupPercent', numValue);
    } else {
      onUpdate(lineItem.id, 'markupAmount', numValue);
    }
  };

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    onUpdate(lineItem.id, 'pricePerUnit', price);
  };

  const marginPercent = lineItem.pricePerUnit > 0 
    ? ((lineItem.pricePerUnit - lineItem.costPerUnit) / lineItem.pricePerUnit * 100)
    : 0;

  return (
    <div className={`border rounded-lg border-l-4 ${categoryColors[lineItem.category]} bg-card`}>
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-4 p-4">
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
          <div className="space-y-1">
            <Input
              type="number"
              placeholder="Price per Unit"
              value={lineItem.pricePerUnit || ''}
              onChange={(e) => handlePriceChange(e.target.value)}
              min="0"
              step="0.01"
            />
            <div className="text-xs text-muted-foreground">
              Price: ${(lineItem.pricePerUnit || 0).toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="col-span-1 flex flex-col items-end justify-center">
          <div className="font-semibold text-foreground">
            ${lineItem.total.toFixed(2)}
          </div>
          {marginPercent > 0 && (
            <Badge variant={marginPercent >= 20 ? "default" : marginPercent >= 10 ? "secondary" : "destructive"} className="text-xs mt-1">
              {marginPercent.toFixed(0)}% margin
            </Badge>
          )}
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

      {/* Cost & Markup Details Row */}
      <Separator />
      <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30">
        <div className="col-span-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cost per Unit</label>
            <Input
              type="number"
              placeholder="0.00"
              value={lineItem.costPerUnit || ''}
              onChange={(e) => handleCostChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        
        <div className="col-span-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Markup Type</label>
            <div className="flex gap-2">
              <Button
                variant={markupType === 'percent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMarkupTypeChange('percent')}
                className="flex-1"
              >
                <Percent className="h-3 w-3 mr-1" />
                %
              </Button>
              <Button
                variant={markupType === 'amount' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMarkupTypeChange('amount')}
                className="flex-1"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                $
              </Button>
            </div>
          </div>
        </div>
        
        <div className="col-span-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {markupType === 'percent' ? 'Markup %' : 'Markup $'}
            </label>
            <Input
              type="number"
              placeholder={markupType === 'percent' ? '15.0' : '0.00'}
              value={markupType === 'percent' ? (lineItem.markupPercent || '') : (lineItem.markupAmount || '')}
              onChange={(e) => handleMarkupValueChange(e.target.value)}
              min="0"
              step={markupType === 'percent' ? '0.1' : '0.01'}
            />
          </div>
        </div>
        
        <div className="col-span-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Total Cost</div>
              <div className="font-medium">${(lineItem.totalCost || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Markup</div>
              <div className="font-medium text-green-600">${(lineItem.totalMarkup || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        <div className="col-span-2 flex items-center justify-end">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Final Price/Unit</div>
            <div className="font-semibold">${(lineItem.pricePerUnit || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};