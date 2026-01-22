import React, { useState } from 'react';
import { Edit, Trash2, Copy, Plus, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { formatQuantityWithUnit } from '@/utils/units';
import { formatCurrency, cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCategoryDotClasses } from '@/utils/categoryColors';
import { useInternalLaborRates } from '@/hooks/useCompanySettings';
import { EstimateTotalsRow } from '@/components/estimates/EstimateTotalsRow';

interface LineItemTableProps {
  lineItems: LineItem[];
  onUpdateLineItem: (id: string, field: keyof LineItem, value: any) => void;
  onRemoveLineItem: (id: string) => void;
  onAddLineItem: () => void;
  onEditDetails: (lineItem: LineItem) => void;
  onDuplicateLineItem?: (lineItem: LineItem) => void;
  readOnly?: boolean;
  showTotalsRow?: boolean;
}

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
  if (markupPercent < 25) return 'text-warning';
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
  readOnly = false,
  showTotalsRow = false,
}) => {
  const isMobile = useIsMobile();
  const { data: laborRates } = useInternalLaborRates();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (lineItemId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(lineItemId)) {
        next.delete(lineItemId);
      } else {
        next.add(lineItemId);
      }
      return next;
    });
  };

  const calculateLaborCushion = (lineItem: LineItem): number => {
    if (lineItem.category !== LineItemCategory.LABOR) return 0;
    // Use laborHours if set, otherwise use quantity when unit is "hr"
    const hours = lineItem.laborHours ?? (lineItem.unit === 'HR' || lineItem.unit === 'hr' ? lineItem.quantity : 0);
    const billingRate = lineItem.billingRatePerHour || laborRates?.billing_rate_per_hour || 0;
    const actualRate = lineItem.actualCostRatePerHour || laborRates?.actual_cost_per_hour || 0;
    return hours * (billingRate - actualRate);
  };

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

  // Calculate totals for the totals row
  const calculateTotals = () => {
    const totalCost = lineItems.reduce((sum, item) => sum + calculateTotalCost(item), 0);
    const totalMarkup = lineItems.reduce((sum, item) => sum + calculateMarkupAmount(item), 0);
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const avgMarkupPercent = totalCost > 0 ? (totalMarkup / totalCost) * 100 : 0;
    
    return { totalCost, totalMarkup, subtotal, avgMarkupPercent };
  };

  return (
    <div className="space-y-4">
      {lineItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No line items yet. Click "Add Line Item" to get started.</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="min-w-[800px]">
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
              {lineItems.map((lineItem) => {
                const isLaborInternal = lineItem.category === LineItemCategory.LABOR;
                const cushion = calculateLaborCushion(lineItem);
                const isExpanded = expandedRows.has(lineItem.id);
                const hasCushion = cushion > 0;
                const effectiveHours = lineItem.laborHours ?? (lineItem.unit === 'HR' || lineItem.unit === 'hr' ? lineItem.quantity : 0);

                return (
                  <React.Fragment key={lineItem.id}>
                    <TableRow className={cn("hover:bg-muted/20", isMobile ? "h-[36px]" : "h-[32px]")}>
                      <TableCell className="p-2">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${getCategoryDotClasses(lineItem.category)}`} />
                          {readOnly ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5">
                              {getCategoryAbbrev(lineItem.category)}
                            </Badge>
                          ) : (
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
                          )}
                          {isLaborInternal && !readOnly && (
                            <Collapsible open={isExpanded} onOpenChange={() => toggleRowExpansion(lineItem.id)}>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 hover:bg-muted/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpansion(lineItem.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </Collapsible>
                          )}
                        </div>
                      </TableCell>
                  <TableCell className="p-2">
                    {readOnly ? (
                      <div className="text-xs px-2 py-1">{lineItem.description}</div>
                    ) : (
                      <EditableCell
                        value={lineItem.description}
                        onChange={(value) => onUpdateLineItem(lineItem.id, 'description', value)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    {readOnly ? (
                      <div className="text-xs font-mono px-2 py-1 text-right">
                        {lineItem.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <QuantityEditableCell
                        quantity={lineItem.quantity}
                        unit={lineItem.unit}
                        onChange={(value) => onUpdateLineItem(lineItem.id, 'quantity', parseFloat(value) || 0)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {readOnly ? (
                      <div className="text-xs px-2 py-1">{lineItem.unit || '-'}</div>
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    {readOnly ? (
                      <div className="text-xs font-mono px-2 py-1 text-right">{formatCurrency(lineItem.costPerUnit)}</div>
                    ) : (
                      <EditableCell
                        value={lineItem.costPerUnit}
                        onChange={(value) => onUpdateLineItem(lineItem.id, 'costPerUnit', parseFloat(value) || 0)}
                        type="number"
                        currency={true}
                        align="right"
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    {readOnly ? (
                      <div className={`text-xs font-mono px-2 py-1 text-right ${getMarkupColor(calculateMarkupPercent(lineItem))}`}>
                        {calculateMarkupPercent(lineItem).toFixed(3)}
                      </div>
                    ) : (
                      <EditableCell
                        value={calculateMarkupPercent(lineItem).toFixed(3)}
                        onChange={(value) => handleMarkupPercentChange(lineItem.id, parseFloat(value) || 0)}
                        type="number"
                        align="right"
                        className={getMarkupColor(calculateMarkupPercent(lineItem))}
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    {readOnly ? (
                      <div className="text-xs font-mono px-2 py-1 text-right">{formatCurrency(calculateMarkupAmount(lineItem))}</div>
                    ) : (
                      <EditableCell
                        value={calculateMarkupAmount(lineItem)}
                        onChange={(value) => handleMarkupAmountChange(lineItem.id, parseFloat(value) || 0)}
                        type="number"
                        currency={true}
                        align="right"
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-right font-mono text-xs font-semibold">
                    {formatCurrency(lineItem.total)}
                  </TableCell>
                  <TableCell className="p-2">
                    {!readOnly && (
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
                    )}
                  </TableCell>
                </TableRow>
                {isLaborInternal && isExpanded && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={9} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Internal Labor Cushion Details</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onEditDetails(lineItem)}
                          >
                            <Edit className="h-3 w-3 mr-1.5" />
                            Edit Labor Details
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <Label className="text-muted-foreground">Labor Hours</Label>
                            <div className="font-mono font-semibold mt-1">
                              {effectiveHours > 0 ? effectiveHours.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-'} hrs
                            </div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Billing Rate</Label>
                            <div className="font-mono font-semibold mt-1">
                              {formatCurrency(lineItem.billingRatePerHour || laborRates?.billing_rate_per_hour || 0)}/hr
                            </div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Actual Cost Rate</Label>
                            <div className="font-mono font-semibold mt-1">
                              {formatCurrency(lineItem.actualCostRatePerHour || laborRates?.actual_cost_per_hour || 0)}/hr
                            </div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Labor Cushion</Label>
                            <div className="font-mono font-semibold mt-1 text-green-600">
                              {formatCurrency(cushion)}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Billing Total:</span>
                            <span className="font-mono font-semibold">
                              {formatCurrency(effectiveHours * (lineItem.billingRatePerHour || laborRates?.billing_rate_per_hour || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Actual Cost:</span>
                            <span className="font-mono font-semibold">
                              {formatCurrency(effectiveHours * (lineItem.actualCostRatePerHour || laborRates?.actual_cost_per_hour || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Client Price (with markup):</span>
                            <span className="font-mono font-semibold">{formatCurrency(lineItem.total)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
                );
              })}
              
              {/* Totals Row */}
              {showTotalsRow && lineItems.length > 0 && (
                <EstimateTotalsRow
                  totalCost={calculateTotals().totalCost}
                  totalMarkup={calculateTotals().totalMarkup}
                  avgMarkupPercent={calculateTotals().avgMarkupPercent}
                  subtotal={calculateTotals().subtotal}
                />
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      )}
    </div>
  );
};
