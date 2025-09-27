import React, { useState } from 'react';
import { Edit, Trash2, Copy, Plus, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { formatQuantityWithUnit } from '@/utils/units';

interface LineItemTableProps {
  lineItems: LineItem[];
  onUpdateLineItem: (id: string, field: keyof LineItem, value: any) => void;
  onRemoveLineItem: (id: string) => void;
  onAddLineItem: () => void;
  onEditDetails: (lineItem: LineItem) => void;
}

const getCategoryColor = (category: LineItemCategory): string => {
  switch (category) {
    case LineItemCategory.LABOR: return 'bg-primary';
    case LineItemCategory.SUBCONTRACTOR: return 'bg-accent';
    case LineItemCategory.MATERIALS: return 'bg-secondary';
    case LineItemCategory.EQUIPMENT: return 'bg-muted';
    case LineItemCategory.PERMITS: return 'bg-destructive';
    case LineItemCategory.MANAGEMENT: return 'bg-success';
    case LineItemCategory.OTHER: return 'bg-muted-foreground';
    default: return 'bg-muted-foreground';
  }
};

const getCategoryAbbrev = (category: LineItemCategory): string => {
  switch (category) {
    case LineItemCategory.LABOR: return 'Labor';
    case LineItemCategory.SUBCONTRACTOR: return 'Sub';
    case LineItemCategory.MATERIALS: return 'Mat';
    case LineItemCategory.EQUIPMENT: return 'Equip';
    case LineItemCategory.PERMITS: return 'Permit';
    case LineItemCategory.MANAGEMENT: return 'Mgmt';
    case LineItemCategory.OTHER: return 'Other';
    default: return 'Other';
  }
};

const getMarkupColor = (markupPercent: number): string => {
  if (markupPercent < 0) return 'text-destructive';
  if (markupPercent < 15) return 'text-warning';
  return 'text-success';
};

const EditableCell: React.FC<{
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
  currency?: boolean;
  align?: 'left' | 'right';
}> = ({ value, onChange, type = 'text', className = '', currency = false, align = 'left' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value));
      setIsEditing(false);
    }
  };

  const formatValue = (val: string | number) => {
    if (type === 'number') {
      const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
      if (currency) {
        return `$${numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return numVal.toLocaleString();
    }
    return val || '';
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        type={type}
        className={`h-input-compact ${type === 'number' ? 'font-mono' : ''} ${align === 'right' ? 'text-right' : ''} ${className}`}
        autoFocus
        placeholder={currency ? "0.00" : ""}
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-muted/50 border border-input bg-background px-compact py-1 rounded-md h-input-compact flex items-center text-data ${
        type === 'number' ? 'font-mono' : ''
      } ${align === 'right' ? 'text-right' : ''} ${className}`}
      onClick={() => {
        setEditValue(String(value));
        setIsEditing(true);
      }}
    >
      {formatValue(value)}
    </div>
  );
};

const QuantityEditableCell: React.FC<{
  quantity: number;
  unit?: string | null;
  onChange: (value: string) => void;
}> = ({ quantity, unit, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(quantity));

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(quantity));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        type="number"
        className="h-input-compact font-mono text-right"
        autoFocus
      />
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-muted/50 border border-input bg-background px-compact py-1 rounded-md h-input-compact flex items-center text-data font-mono text-right"
      onClick={() => {
        setEditValue(String(quantity));
        setIsEditing(true);
      }}
    >
      {unit ? formatQuantityWithUnit(quantity, unit) : quantity.toLocaleString()}
    </div>
  );
};

export const LineItemTable: React.FC<LineItemTableProps> = ({
  lineItems,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
  onEditDetails,
}) => {
  const calculateMarkupPercent = (lineItem: LineItem): number => {
    const { costPerUnit, pricePerUnit } = lineItem;
    if (costPerUnit <= 0) return 0;
    return ((pricePerUnit - costPerUnit) / costPerUnit) * 100;
  };

  const calculateTotalCost = (lineItem: LineItem): number => {
    return lineItem.quantity * lineItem.costPerUnit;
  };

  const calculateMarkupAmount = (lineItem: LineItem): number => {
    const totalCost = calculateTotalCost(lineItem);
    return lineItem.total - totalCost;
  };

  const handleTotalCostChange = (lineItemId: string, newTotalCost: number) => {
    const lineItem = lineItems.find(item => item.id === lineItemId);
    if (!lineItem) return;
    
    const newCostPerUnit = lineItem.quantity > 0 ? newTotalCost / lineItem.quantity : 0;
    onUpdateLineItem(lineItemId, 'costPerUnit', newCostPerUnit);
  };

  const handleMarkupAmountChange = (lineItemId: string, newMarkupAmount: number) => {
    const lineItem = lineItems.find(item => item.id === lineItemId);
    if (!lineItem) return;
    
    const totalCost = calculateTotalCost(lineItem);
    const newTotal = totalCost + newMarkupAmount;
    const newPricePerUnit = lineItem.quantity > 0 ? newTotal / lineItem.quantity : 0;
    
    onUpdateLineItem(lineItemId, 'pricePerUnit', newPricePerUnit);
    onUpdateLineItem(lineItemId, 'total', newTotal);
  };

  const handleMarkupPercentChange = (lineItemId: string, markupPercent: number) => {
    const lineItem = lineItems.find(item => item.id === lineItemId);
    if (!lineItem) return;
    
    const totalCost = calculateTotalCost(lineItem);
    const newMarkupAmount = totalCost * (markupPercent / 100);
    const newTotal = totalCost + newMarkupAmount;
    const newPricePerUnit = lineItem.quantity > 0 ? newTotal / lineItem.quantity : 0;
    
    onUpdateLineItem(lineItemId, 'markupPercent', markupPercent);
    onUpdateLineItem(lineItemId, 'pricePerUnit', newPricePerUnit);
    onUpdateLineItem(lineItemId, 'total', newTotal);
  };

  const duplicateLineItem = (lineItem: LineItem) => {
    // Create a new line item with the same data but new ID
    const newLineItem = {
      ...lineItem,
      id: crypto.randomUUID(),
      description: `${lineItem.description} (Copy)`,
    };
    // This would need to be handled by the parent component
    console.log('Duplicate line item:', newLineItem);
  };

  return (
    <div className="space-y-4">
      {lineItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No line items yet. Click "Add Line Item" to get started.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="h-table-header">
                <TableHead className="w-[100px] p-compact text-label font-medium">Category</TableHead>
                <TableHead className="min-w-[180px] p-compact text-label font-medium">Description</TableHead>
                <TableHead className="w-[60px] p-compact text-label font-medium text-right">Qty</TableHead>
                <TableHead className="w-[80px] p-compact text-label font-medium text-right">Cost</TableHead>
                <TableHead className="w-[60px] p-compact text-label font-medium text-right">Markup%</TableHead>
                <TableHead className="w-[80px] p-compact text-label font-medium text-right">Markup</TableHead>
                <TableHead className="w-[90px] p-compact text-label font-medium text-right">Total Price</TableHead>
                <TableHead className="w-[40px] p-compact"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((lineItem) => (
                <TableRow key={lineItem.id} className="h-table-row-dense hover:bg-muted/20">
                  <TableCell className="p-compact">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getCategoryColor(lineItem.category)}`} />
                      <Select
                        value={lineItem.category}
                        onValueChange={(value) => onUpdateLineItem(lineItem.id, 'category', value)}
                      >
                        <SelectTrigger className="h-button-compact border-0 bg-transparent p-0 hover:bg-muted/50">
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 cursor-pointer">
                            {getCategoryAbbrev(lineItem.category)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_DISPLAY_MAP).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="p-compact">
                    <EditableCell
                      value={lineItem.description}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'description', value)}
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell className="p-compact text-right">
                    <div className="space-y-1">
                      <QuantityEditableCell
                        quantity={lineItem.quantity}
                        unit={lineItem.unit}
                        onChange={(value) => onUpdateLineItem(lineItem.id, 'quantity', parseFloat(value) || 0)}
                      />
                      {lineItem.unit && (
                        <div className="text-xs text-muted-foreground text-right">
                          {lineItem.unit}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-compact text-right">
                    <EditableCell
                      value={calculateTotalCost(lineItem)}
                      onChange={(value) => handleTotalCostChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      currency={true}
                      align="right"
                    />
                  </TableCell>
                  <TableCell className="p-compact text-right">
                    <EditableCell
                      value={calculateMarkupPercent(lineItem)}
                      onChange={(value) => handleMarkupPercentChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      align="right"
                      className={getMarkupColor(calculateMarkupPercent(lineItem))}
                    />
                  </TableCell>
                  <TableCell className="p-compact text-right">
                    <EditableCell
                      value={calculateMarkupAmount(lineItem)}
                      onChange={(value) => handleMarkupAmountChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      currency={true}
                      align="right"
                    />
                  </TableCell>
                  <TableCell className="p-compact text-right font-mono text-data font-medium">
                    ${lineItem.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="p-compact">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-button-compact w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => onEditDetails(lineItem)} className="text-xs">
                          <Edit className="h-3 w-3 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateLineItem(lineItem)} className="text-xs">
                          <Copy className="h-3 w-3 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs text-destructive">
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{lineItem.description}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onRemoveLineItem(lineItem.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};