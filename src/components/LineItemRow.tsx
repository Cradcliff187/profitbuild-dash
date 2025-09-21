import { X, DollarSign, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";

interface LineItemRowProps {
  lineItem: LineItem;
  onUpdate: (id: string, field: keyof LineItem, value: any) => void;
  onRemove: (id: string) => void;
}

const categoryColors = {
  [LineItemCategory.LABOR]: "border-l-blue-500",
  [LineItemCategory.SUBCONTRACTOR]: "border-l-amber-500",
  [LineItemCategory.MATERIALS]: "border-l-green-500", 
  [LineItemCategory.EQUIPMENT]: "border-l-orange-500",
  [LineItemCategory.PERMITS]: "border-l-violet-500",
  [LineItemCategory.MANAGEMENT]: "border-l-indigo-500",
  [LineItemCategory.OTHER]: "border-l-purple-500"
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
      {/* Mobile-First Layout */}
      <div className="p-4 space-y-4">
        {/* Top Row: Category, Description, Remove Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="sm:w-48">
            <Select value={lineItem.category} onValueChange={(value: LineItemCategory) => onUpdate(lineItem.id, 'category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category">
                  {lineItem.category && CATEGORY_DISPLAY_MAP[lineItem.category]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LineItemCategory.LABOR}>{CATEGORY_DISPLAY_MAP[LineItemCategory.LABOR]}</SelectItem>
                <SelectItem value={LineItemCategory.SUBCONTRACTOR}>{CATEGORY_DISPLAY_MAP[LineItemCategory.SUBCONTRACTOR]}</SelectItem>
                <SelectItem value={LineItemCategory.MATERIALS}>{CATEGORY_DISPLAY_MAP[LineItemCategory.MATERIALS]}</SelectItem>
                <SelectItem value={LineItemCategory.EQUIPMENT}>{CATEGORY_DISPLAY_MAP[LineItemCategory.EQUIPMENT]}</SelectItem>
                <SelectItem value={LineItemCategory.PERMITS}>{CATEGORY_DISPLAY_MAP[LineItemCategory.PERMITS]}</SelectItem>
                <SelectItem value={LineItemCategory.MANAGEMENT}>{CATEGORY_DISPLAY_MAP[LineItemCategory.MANAGEMENT]}</SelectItem>
                <SelectItem value={LineItemCategory.OTHER}>{CATEGORY_DISPLAY_MAP[LineItemCategory.OTHER]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Input
              placeholder="Description"
              value={lineItem.description}
              onChange={(e) => onUpdate(lineItem.id, 'description', e.target.value)}
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(lineItem.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 self-start sm:self-center"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Numbers Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Quantity</label>
            <Input
              type="number"
              placeholder="Qty"
              value={lineItem.quantity || ''}
              onChange={(e) => handleQuantityChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Price/Unit</label>
            <Input
              type="number"
              placeholder="Price per Unit"
              value={lineItem.pricePerUnit || ''}
              onChange={(e) => handlePriceChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="flex flex-col justify-center">
            <label className="text-xs font-medium text-muted-foreground">Total</label>
            <div className="font-semibold text-lg">${lineItem.total.toFixed(2)}</div>
          </div>
          
          <div className="flex flex-col justify-center">
            <label className="text-xs font-medium text-muted-foreground">Margin</label>
            {marginPercent > 0 && (
              <Badge variant={marginPercent >= 20 ? "default" : marginPercent >= 10 ? "secondary" : "destructive"} className="text-xs w-fit">
                {marginPercent.toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Cost & Markup Details Section */}
      <Separator />
      <div className="p-4 bg-muted/30 space-y-4">
        <div className="text-sm font-medium text-muted-foreground">Cost & Markup Details</div>
        
        {/* Cost Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Cost per Unit</label>
            <Input
              type="number"
              placeholder="0.00"
              value={lineItem.costPerUnit || ''}
              onChange={(e) => handleCostChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="font-medium">${(lineItem.totalCost || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Markup</div>
              <div className="font-medium text-green-600">${(lineItem.totalMarkup || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        {/* Markup Controls */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Markup Type</label>
            <div className="flex gap-2">
              <Button
                variant={markupType === 'percent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMarkupTypeChange('percent')}
                className="flex-1"
              >
                <Percent className="h-3 w-3 mr-1" />
                Percentage
              </Button>
              <Button
                variant={markupType === 'amount' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMarkupTypeChange('amount')}
                className="flex-1"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Amount
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {markupType === 'percent' ? 'Markup Percentage' : 'Markup Amount'}
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
            
            <div className="flex flex-col justify-center">
              <div className="text-xs text-muted-foreground">Final Price/Unit</div>
              <div className="font-semibold text-lg">${(lineItem.pricePerUnit || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};