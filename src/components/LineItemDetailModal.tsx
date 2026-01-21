import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { formatCurrency } from '@/lib/utils';
import { CONSTRUCTION_UNITS, UnitCategory, getRecommendedUnitCodes } from '@/utils/units';
import { useInternalLaborRates } from '@/hooks/useCompanySettings';
import { createLaborLineItemDefaults } from '@/utils/laborCalculations';

interface LineItemDetailModalProps {
  lineItem: LineItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (lineItem: LineItem) => void;
}

type MarkupType = 'percent' | 'amount';

export const LineItemDetailModal: React.FC<LineItemDetailModalProps> = ({
  lineItem,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<LineItem | null>(null);
  const [markupType, setMarkupType] = useState<MarkupType>('percent');
  const { data: laborRates } = useInternalLaborRates();

  useEffect(() => {
    if (lineItem) {
      setFormData({ ...lineItem });
      // Set markup type based on which field is populated
      if (lineItem.markupAmount !== null && lineItem.markupAmount !== undefined) {
        setMarkupType('amount');
      } else {
        setMarkupType('percent');
      }
    }
  }, [lineItem]);

  if (!formData) return null;

  const getCategoryColor = (category: LineItemCategory): string => {
    switch (category) {
      case LineItemCategory.LABOR: return 'border-l-blue-500';
      case LineItemCategory.SUBCONTRACTOR: return 'border-l-green-500';
      case LineItemCategory.MATERIALS: return 'border-l-orange-500';
      case LineItemCategory.EQUIPMENT: return 'border-l-purple-500';
      case LineItemCategory.PERMITS: return 'border-l-red-500';
      case LineItemCategory.MANAGEMENT: return 'border-l-teal-500';
      case LineItemCategory.OTHER: return 'border-l-gray-500';
      default: return 'border-l-gray-500';
    }
  };

  const handleFieldChange = (field: keyof LineItem, value: any) => {
    const updatedItem = { ...formData, [field]: value };

    // Special handling when category changes - auto-update unit
    if (field === 'category') {
      const recommendedUnits = getRecommendedUnitCodes(value);
      if (recommendedUnits.length > 0 && !formData.unit) {
        updatedItem.unit = recommendedUnits[0];
      }
      
      // Auto-populate labor fields when category changes to labor_internal
      if (value === LineItemCategory.LABOR && laborRates) {
        const currentHours = updatedItem.laborHours || updatedItem.quantity || 1;
        const currentMarkup = updatedItem.markupPercent || 25;
        const defaults = createLaborLineItemDefaults(laborRates, currentHours, currentMarkup);
        
        updatedItem.laborHours = defaults.laborHours;
        updatedItem.billingRatePerHour = defaults.billingRatePerHour;
        updatedItem.actualCostRatePerHour = defaults.actualCostRatePerHour;
        updatedItem.costPerUnit = defaults.costPerUnit;
        updatedItem.pricePerUnit = defaults.pricePerUnit;
        updatedItem.quantity = defaults.quantity;
        updatedItem.unit = defaults.unit;
      }
    }
    
    // Calculate labor cushion when labor fields change
    if (formData.category === LineItemCategory.LABOR && 
        ['laborHours', 'billingRatePerHour', 'actualCostRatePerHour'].includes(field)) {
      if (updatedItem.laborHours && updatedItem.billingRatePerHour && updatedItem.actualCostRatePerHour) {
        updatedItem.laborCushionAmount = 
          updatedItem.laborHours * (updatedItem.billingRatePerHour - updatedItem.actualCostRatePerHour);
      } else {
        updatedItem.laborCushionAmount = 0;
      }
    }

    // Calculate totals when relevant fields change
    if (['quantity', 'costPerUnit', 'markupPercent', 'markupAmount', 'laborHours', 'billingRatePerHour'].includes(field)) {
      // For labor items, use billing rate for price calculation
      if (updatedItem.category === LineItemCategory.LABOR && updatedItem.billingRatePerHour) {
        // IMPORTANT: costPerUnit for labor = billing rate (includes cushion)
        updatedItem.costPerUnit = updatedItem.billingRatePerHour;
        
        // Calculate price per unit based on markup applied to billing rate
        let pricePerUnit = updatedItem.billingRatePerHour;
        
        if (markupType === 'percent' && updatedItem.markupPercent) {
          pricePerUnit = updatedItem.billingRatePerHour * (1 + updatedItem.markupPercent / 100);
          updatedItem.markupAmount = null;
        } else if (markupType === 'amount' && updatedItem.markupAmount) {
          pricePerUnit = updatedItem.billingRatePerHour + updatedItem.markupAmount;
          updatedItem.markupPercent = null;
        }
        
        updatedItem.pricePerUnit = pricePerUnit;
        updatedItem.total = updatedItem.quantity * pricePerUnit;
        // totalCost uses billing rate (what client sees as "cost"), not actual cost
        updatedItem.totalCost = updatedItem.billingRatePerHour * (updatedItem.laborHours || updatedItem.quantity);
        updatedItem.totalMarkup = updatedItem.total - updatedItem.totalCost;
      } else {
        // Standard calculation for non-labor items
        let pricePerUnit = updatedItem.costPerUnit;
        
        if (markupType === 'percent' && updatedItem.markupPercent) {
          pricePerUnit = updatedItem.costPerUnit * (1 + updatedItem.markupPercent / 100);
          updatedItem.markupAmount = null;
        } else if (markupType === 'amount' && updatedItem.markupAmount) {
          pricePerUnit = updatedItem.costPerUnit + updatedItem.markupAmount;
          updatedItem.markupPercent = null;
        }

        updatedItem.pricePerUnit = pricePerUnit;
        updatedItem.total = updatedItem.quantity * pricePerUnit;
        updatedItem.totalCost = updatedItem.quantity * updatedItem.costPerUnit;
        updatedItem.totalMarkup = updatedItem.total - updatedItem.totalCost;
      }
    }

    setFormData(updatedItem);
  };

  const handleMarkupTypeChange = (type: MarkupType) => {
    setMarkupType(type);
    const updatedItem = { ...formData };
    
    if (type === 'percent') {
      updatedItem.markupAmount = null;
      if (!updatedItem.markupPercent) {
        updatedItem.markupPercent = 25; // Default 25%
      }
    } else {
      updatedItem.markupPercent = null;
      if (!updatedItem.markupAmount) {
        updatedItem.markupAmount = 0;
      }
    }
    
    handleFieldChange('markupPercent', updatedItem.markupPercent);
    handleFieldChange('markupAmount', updatedItem.markupAmount);
  };

  const calculateMarginPercent = (): number => {
    if (formData.pricePerUnit <= 0) return 0;
    return ((formData.pricePerUnit - formData.costPerUnit) / formData.pricePerUnit) * 100;
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Line Item Details</DialogTitle>
        </DialogHeader>
        
        <div className={`space-y-6 border-l-4 pl-6 ${getCategoryColor(formData.category)}`}>
          {/* Category and Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleFieldChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_DISPLAY_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit (Optional)</Label>
              <Select
                value={formData.unit || 'none'}
                onValueChange={(value) => handleFieldChange('unit', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No unit</SelectItem>
                  {Object.values(UnitCategory).map((category) => {
                    const unitsInCategory = CONSTRUCTION_UNITS.filter(u => u.category === category);
                    if (unitsInCategory.length === 0) return null;
                    
                    return (
                      <SelectGroup key={category}>
                        <SelectLabel className="capitalize">{category}</SelectLabel>
                        {unitsInCategory.map((unit) => (
                          <SelectItem key={unit.code} value={unit.code}>
                            {unit.symbol} - {unit.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Describe the work or materials..."
              rows={2}
            />
          </div>

          {/* Quantity and Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cost per Unit</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.costPerUnit}
                onChange={(e) => handleFieldChange('costPerUnit', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Labor-Specific Fields (only for labor_internal) */}
          {formData.category === LineItemCategory.LABOR && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900">Internal Labor Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="laborHours">Labor Hours</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    step="0.5"
                    value={formData.laborHours || formData.quantity || ''}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || 0;
                      handleFieldChange('laborHours', hours);
                      handleFieldChange('quantity', hours); // Sync quantity with hours
                    }}
                    placeholder="e.g., 200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billingRate">Billing Rate ($/hr)</Label>
                  <Input
                    id="billingRate"
                    type="number"
                    step="0.01"
                    value={formData.billingRatePerHour || ''}
                    onChange={(e) => handleFieldChange('billingRatePerHour', parseFloat(e.target.value) || 0)}
                    placeholder="75.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Rate shown to client
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="actualCostRate">Actual Cost Rate ($/hr)</Label>
                  <Input
                    id="actualCostRate"
                    type="number"
                    step="0.01"
                    value={formData.actualCostRatePerHour || ''}
                    onChange={(e) => handleFieldChange('actualCostRatePerHour', parseFloat(e.target.value) || 0)}
                    placeholder="35.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Real internal cost
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Labor Cushion</Label>
                  <div className="h-10 px-3 py-2 bg-green-100 border border-green-300 rounded-md flex items-center">
                    <span className="font-mono font-semibold text-green-700">
                      {formatCurrency(
                        (formData.laborHours || 0) * 
                        ((formData.billingRatePerHour || 0) - (formData.actualCostRatePerHour || 0))
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Hidden profit from rate differential
                  </p>
                </div>
              </div>
              
              {/* Summary Box */}
              <div className="bg-white p-3 rounded border">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Billing Total:</span>
                    <span className="font-mono ml-2">
                      {formatCurrency((formData.laborHours || formData.quantity || 0) * (formData.billingRatePerHour || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Cost:</span>
                    <span className="font-mono ml-2">
                      {formatCurrency((formData.laborHours || formData.quantity || 0) * (formData.actualCostRatePerHour || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Client Price:</span>
                    <span className="font-mono ml-2 font-semibold">
                      {formatCurrency(formData.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Markup Section */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Markup</Label>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleMarkupTypeChange('percent')}
                  className={`px-3 py-1 text-sm ${
                    markupType === 'percent'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkupTypeChange('amount')}
                  className={`px-3 py-1 text-sm ${
                    markupType === 'amount'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Amount
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {markupType === 'percent' ? 'Markup Percentage' : 'Markup Amount'}
                </Label>
                <Input
                  type="number"
                  step={markupType === 'percent' ? '0.001' : '0.01'}
                  min={markupType === 'percent' ? -100 : undefined}
                  max={markupType === 'percent' ? 1000 : undefined}
                  value={
                    markupType === 'percent'
                      ? (formData.markupPercent || 0)
                      : (formData.markupAmount || 0)
                  }
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    handleFieldChange(
                      markupType === 'percent' ? 'markupPercent' : 'markupAmount',
                      value
                    );
                  }}
                  placeholder={markupType === 'percent' ? '25.375 (negative for discount)' : '10.00'}
                  className={markupType === 'percent' && (formData.markupPercent || 0) < 0 ? 'text-destructive' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Price per Unit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerUnit || formData.costPerUnit}
                  onChange={(e) => handleFieldChange('pricePerUnit', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Calculations Display */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-background border rounded-lg">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-lg font-semibold">
                {formatCurrency(formData.totalCost)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Markup</div>
              <div className="text-lg font-semibold">
                {formatCurrency(formData.totalMarkup)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Margin</div>
              <Badge variant={calculateMarginPercent() < 0 ? "destructive" : calculateMarginPercent() < 10 ? "outline" : "secondary"}>
                {calculateMarginPercent().toFixed(3)}%
              </Badge>
            </div>
          </div>

          {/* Final Total */}
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Line Item Total</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(formData.total)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};