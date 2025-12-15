import React, { useState } from 'react';
import { Edit, Trash2, Plus, MoreHorizontal, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChangeOrderLineItemInput } from '@/types/changeOrder';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { PayeeSelector } from '@/components/PayeeSelector';
import { getCategoryDotClasses } from '@/utils/categoryColors';

interface ChangeOrderLineItemTableProps {
  lineItems: ChangeOrderLineItemInput[];
  onUpdateLineItem: (index: number, field: keyof ChangeOrderLineItemInput, value: any) => void;
  onRemoveLineItem: (index: number) => void;
  onAddLineItem: () => void;
  contingencyRemaining: number;
  showContingencyGuidance: boolean;
}

const getCategoryAbbrev = (category: string): string => {
  switch (category) {
    case 'labor_internal': return 'Labor';
    case 'subcontractors': return 'Sub';
    case 'materials': return 'Mat';
    case 'equipment': return 'Equip';
    case 'permits': return 'Permit';
    case 'management': return 'Mgmt';
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
        className={`h-8 text-xs ${type === 'number' ? 'font-mono' : ''} ${align === 'right' ? 'text-right' : ''} ${className}`}
        autoFocus
        placeholder={currency ? "0.00" : ""}
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-muted/50 border border-input bg-background px-2 py-1 rounded-md h-8 flex items-center text-xs ${
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

export const ChangeOrderLineItemTable: React.FC<ChangeOrderLineItemTableProps> = ({
  lineItems,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
  contingencyRemaining,
  showContingencyGuidance,
}) => {
  const isMobile = useIsMobile();

  const calculateMarkupPercent = (item: ChangeOrderLineItemInput): number => {
    if (item.cost_per_unit <= 0) return 0;
    return ((item.price_per_unit - item.cost_per_unit) / item.cost_per_unit) * 100;
  };

  const calculateTotalCost = (item: ChangeOrderLineItemInput): number => {
    return item.quantity * item.cost_per_unit;
  };

  const calculateTotalPrice = (item: ChangeOrderLineItemInput): number => {
    return item.quantity * item.price_per_unit;
  };

  const calculateMarkupAmount = (item: ChangeOrderLineItemInput): number => {
    const totalCost = calculateTotalCost(item);
    return calculateTotalPrice(item) - totalCost;
  };

  const totals = lineItems.reduce(
    (acc, item) => ({
      totalCost: acc.totalCost + calculateTotalCost(item),
      totalPrice: acc.totalPrice + calculateTotalPrice(item),
    }),
    { totalCost: 0, totalPrice: 0 }
  );

  const totalMargin = totals.totalPrice - totals.totalCost;
  const marginPercent = totals.totalPrice > 0 ? (totalMargin / totals.totalPrice) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="text-xs p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-300">Expense Tracking</p>
            <p className="text-blue-600 dark:text-blue-400 mt-1">
              Assign payees to each line item. After approval, use the <strong>Expense Matching</strong> interface 
              to correlate actual expenses and track quoted vs. actual costs.
            </p>
          </div>
        </div>
      </div>

      {showContingencyGuidance && (
        <div className="text-xs p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="font-medium text-blue-700 dark:text-blue-300">💡 Using Contingency</p>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            Add line items below to specify what work is being done. The contingency will help cover the costs.
            Available contingency: {formatCurrency(contingencyRemaining)}
          </p>
        </div>
      )}

      {lineItems.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
          <p className="text-sm">No line items yet. Click "Add Line Item" to get started.</p>
          <p className="text-xs mt-1">Line items are required to document the work being performed.</p>
        </div>
      ) : isMobile ? (
        // Mobile Card Layout
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <Card key={index} className="border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getCategoryDotClasses(item.category)}`} />
                    <Select
                      value={item.category}
                      onValueChange={(value) => onUpdateLineItem(index, 'category', value)}
                    >
                      <SelectTrigger className="h-6 border-0 bg-transparent p-0 hover:bg-muted/50 w-auto">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 cursor-pointer">
                          {getCategoryAbbrev(item.category)}
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
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </div>
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs text-destructive">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this line item? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRemoveLineItem(index)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Payee</Label>
                    <PayeeSelector
                      value={item.payee_id || ''}
                      onValueChange={(value) => onUpdateLineItem(index, 'payee_id', value || null)}
                      placeholder="Select..."
                      compact={true}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => onUpdateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => onUpdateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm font-mono flex-1"
                      />
                      <Select 
                        value={item.unit || 'none'} 
                        onValueChange={(value) => onUpdateLineItem(index, 'unit', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger className="h-8 w-16 text-xs">
                          <SelectValue />
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
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="text-sm font-semibold font-mono">{formatCurrency(calculateTotalPrice(item))}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cost/Unit</Label>
                    <Input
                      type="number"
                      value={item.cost_per_unit}
                      onChange={(e) => onUpdateLineItem(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Price/Unit</Label>
                    <Input
                      type="number"
                      value={item.price_per_unit}
                      onChange={(e) => onUpdateLineItem(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Markup %</Label>
                    <div className={cn(
                      "text-xs font-mono",
                      calculateMarkupPercent(item) < 0 ? "text-destructive" :
                      calculateMarkupPercent(item) < 25 ? "text-warning" : "text-success"
                    )}>
                      {calculateMarkupPercent(item).toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Markup $</Label>
                    <div className="text-xs font-mono">{formatCurrency(calculateMarkupAmount(item))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop Table Layout
        <div className="border rounded-md overflow-x-auto">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow className={cn("h-8", isMobile ? "bg-muted/30" : "sticky top-0 bg-background z-10")}>
                  <TableHead className="p-2 font-medium text-[11px] w-[70px]">Cat</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] w-[130px]">Payee</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] min-w-[150px]">Description</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] text-right w-[60px]">Qty</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] w-[50px]">Unit</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] text-right w-[80px]">Cost/Unit</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] text-right w-[80px]">Price/Unit</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] text-right w-[65px]">Markup%</TableHead>
                  <TableHead className="p-2 font-medium text-[11px] text-right w-[90px]">Total</TableHead>
                  <TableHead className="p-2 w-[35px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/20 h-8">
                    <TableCell className="p-2">
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${getCategoryDotClasses(item.category)}`} />
                        <Select
                          value={item.category}
                          onValueChange={(value) => onUpdateLineItem(index, 'category', value)}
                        >
                          <SelectTrigger className="h-7 border-0 bg-transparent p-0 hover:bg-muted/50">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 cursor-pointer">
                              {getCategoryAbbrev(item.category)}
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
                      <PayeeSelector
                        value={item.payee_id || ''}
                        onValueChange={(value) => onUpdateLineItem(index, 'payee_id', value || null)}
                        placeholder="Select..."
                        compact={true}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <EditableCell
                        value={item.description}
                        onChange={(value) => onUpdateLineItem(index, 'description', value)}
                      />
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <EditableCell
                        value={item.quantity}
                        onChange={(value) => onUpdateLineItem(index, 'quantity', parseFloat(value) || 0)}
                        type="number"
                        align="right"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select 
                        value={item.unit || 'none'} 
                        onValueChange={(value) => onUpdateLineItem(index, 'unit', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                        value={item.cost_per_unit}
                        onChange={(value) => onUpdateLineItem(index, 'cost_per_unit', parseFloat(value) || 0)}
                        type="number"
                        currency={true}
                        align="right"
                      />
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <EditableCell
                        value={item.price_per_unit}
                        onChange={(value) => onUpdateLineItem(index, 'price_per_unit', parseFloat(value) || 0)}
                        type="number"
                        currency={true}
                        align="right"
                      />
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <div className={`text-xs font-mono px-2 py-1 ${getMarkupColor(calculateMarkupPercent(item))}`}>
                        {calculateMarkupPercent(item).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-right font-mono text-xs font-semibold">
                      {formatCurrency(calculateTotalPrice(item))}
                    </TableCell>
                    <TableCell className="p-2">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs text-destructive">
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this line item? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onRemoveLineItem(index)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-muted/50 border-t-2 font-semibold">
                  <TableCell colSpan={5} className="p-2 text-right text-xs">
                    Totals:
                  </TableCell>
                  <TableCell className="p-2 text-right font-mono text-xs">
                    {formatCurrency(totals.totalCost)}
                  </TableCell>
                  <TableCell colSpan={2} className="p-2 text-right text-xs">
                    Margin: {marginPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className="p-2 text-right font-mono text-xs font-bold">
                    {formatCurrency(totals.totalPrice)}
                  </TableCell>
                  <TableCell className="p-2"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Button onClick={onAddLineItem} variant="outline" size="sm" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Line Item
      </Button>
    </div>
  );
};
