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
import { formatCurrency, cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface LineItemTableProps {
  lineItems: LineItem[];
  onUpdateLineItem: (id: string, field: keyof LineItem, value: any) => void;
  onRemoveLineItem: (id: string) => void;
  onAddLineItem: () => void;
  onEditDetails: (lineItem: LineItem) => void;
  onDuplicateLineItem?: (lineItem: LineItem) => void;
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
        return formatCurrency(numVal);
      }
      return numVal.toLocaleString('en-US', { maximumFractionDigits: 2 });
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
        className={`h-input-dense ${type === 'number' ? 'font-mono' : ''} ${align === 'right' ? 'text-right' : ''} ${className}`}
        autoFocus
        placeholder={currency ? "0.00" : ""}
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-muted/50 border border-input bg-background px-2 py-1 rounded-md h-input-dense flex items-center text-xs ${
        type === 'number' ? 'font-mono' : ''
      } ${align === 'right' ? 'text-right justify-end' : ''} ${className}`}
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
        className="h-input-dense font-mono text-right text-xs"
        autoFocus
      />
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-muted/50 border border-input bg-background px-2 py-1 rounded-md h-input-dense flex items-center justify-end text-xs font-mono text-right"
      onClick={() => {
        setEditValue(String(quantity));
        setIsEditing(true);
      }}
    >
      {quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}
    </div>
  );
};

export const LineItemTable: React.FC<LineItemTableProps> = ({
  lineItems,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
  onEditDetails,
  onDuplicateLineItem,
}) => {
  const isMobile = useIsMobile();
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

  const handleDuplicate = (lineItem: LineItem) => {
    if (onDuplicateLineItem) {
      onDuplicateLineItem(lineItem);
    }
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
              <TableRow className={cn("h-table-header", isMobile ? "bg-muted/30" : "sticky top-0 bg-background z-10")}>
                <TableHead className={cn("p-2 font-medium", isMobile ? "w-[90px] text-xs" : "w-[80px] text-[11px]")}>Cat</TableHead>
                <TableHead className={cn("p-2 font-medium", isMobile ? "min-w-[200px] text-xs" : "min-w-[180px] text-[11px]")}>Description</TableHead>
                <TableHead className={cn("p-2 font-medium text-right", isMobile ? "w-[80px] text-xs" : "w-[70px] text-[11px]")}>Qty</TableHead>
                <TableHead className={cn("p-2 font-medium", isMobile ? "w-[70px] text-xs" : "w-[60px] text-[11px]")}>Unit</TableHead>
                <TableHead className={cn("p-2 font-medium text-right", isMobile ? "w-[90px] text-xs" : "w-[80px] text-[11px]")}>Cost/Unit</TableHead>
                <TableHead className={cn("p-2 font-medium text-right", isMobile ? "w-[70px] text-xs" : "w-[65px] text-[11px]")}>Markup%</TableHead>
                <TableHead className={cn("p-2 font-medium text-right", isMobile ? "w-[90px] text-xs" : "w-[80px] text-[11px]")}>Markup $</TableHead>
                <TableHead className={cn("p-2 font-medium text-right", isMobile ? "w-[100px] text-xs" : "w-[90px] text-[11px]")}>Total</TableHead>
                <TableHead className={cn("p-2", isMobile ? "w-[40px]" : "w-[35px]")}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((lineItem) => (
                <TableRow key={lineItem.id} className={cn("hover:bg-muted/20", isMobile ? "h-[36px]" : "h-[32px]")}>
                  <TableCell className="p-2">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(lineItem.category)}`} />
                      <Select
                        value={lineItem.category}
                        onValueChange={(value) => onUpdateLineItem(lineItem.id, 'category', value)}
                      >
                        <SelectTrigger className="h-[28px] border-0 bg-transparent p-0 hover:bg-muted/50">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 cursor-pointer">
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
                  <TableCell className="p-2">
                    <EditableCell
                      value={lineItem.description}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'description', value)}
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <QuantityEditableCell
                      quantity={lineItem.quantity}
                      unit={lineItem.unit}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'quantity', parseFloat(value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Select 
                      value={lineItem.unit || 'none'} 
                      onValueChange={(value) => onUpdateLineItem(lineItem.id, 'unit', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-[32px] text-xs">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="EA">ea</SelectItem>
                        <SelectItem value="SF">sf</SelectItem>
                        <SelectItem value="LF">lf</SelectItem>
                        <SelectItem value="CY">cy</SelectItem>
                        <SelectItem value="HR">hr</SelectItem>
                        <SelectItem value="GAL">gal</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <EditableCell
                      value={lineItem.costPerUnit}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'costPerUnit', parseFloat(value) || 0)}
                      type="number"
                      currency={true}
                      align="right"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <EditableCell
                      value={calculateMarkupPercent(lineItem).toFixed(1)}
                      onChange={(value) => handleMarkupPercentChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      align="right"
                      className={getMarkupColor(calculateMarkupPercent(lineItem))}
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <EditableCell
                      value={calculateMarkupAmount(lineItem)}
                      onChange={(value) => handleMarkupAmountChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      currency={true}
                      align="right"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right font-mono text-xs font-semibold">
                    {formatCurrency(lineItem.total)}
                  </TableCell>
                  <TableCell className="p-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-[28px] w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => onEditDetails(lineItem)} className="text-xs">
                          <Edit className="h-3 w-3 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(lineItem)} className="text-xs" disabled={!onDuplicateLineItem}>
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