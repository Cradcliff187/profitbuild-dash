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

interface LineItemTableProps {
  lineItems: LineItem[];
  onUpdateLineItem: (id: string, field: keyof LineItem, value: any) => void;
  onRemoveLineItem: (id: string) => void;
  onAddLineItem: () => void;
  onEditDetails: (lineItem: LineItem) => void;
}

const getCategoryColor = (category: LineItemCategory): string => {
  switch (category) {
    case LineItemCategory.LABOR: return 'bg-blue-500';
    case LineItemCategory.SUBCONTRACTOR: return 'bg-green-500';
    case LineItemCategory.MATERIALS: return 'bg-orange-500';
    case LineItemCategory.EQUIPMENT: return 'bg-purple-500';
    case LineItemCategory.PERMITS: return 'bg-red-500';
    case LineItemCategory.MANAGEMENT: return 'bg-teal-500';
    case LineItemCategory.OTHER: return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const EditableCell: React.FC<{
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
  currency?: boolean;
}> = ({ value, onChange, type = 'text', className = '', currency = false }) => {
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
        className={`h-8 ${className}`}
        autoFocus
        placeholder={currency ? "0.00" : ""}
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-muted/50 border border-input bg-background px-3 py-2 rounded-md h-8 flex items-center text-sm ${className}`}
      onClick={() => {
        setEditValue(String(value));
        setIsEditing(true);
      }}
    >
      {formatValue(value)}
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
              <TableRow>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[100px]">Cost</TableHead>
                <TableHead className="w-[100px]">Markup</TableHead>
                <TableHead className="w-[80px]">Markup%</TableHead>
                <TableHead className="w-[100px]">Total Price</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((lineItem) => (
                <TableRow key={lineItem.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${getCategoryColor(lineItem.category)}`} />
                      <Select
                        value={lineItem.category}
                        onValueChange={(value) => onUpdateLineItem(lineItem.id, 'category', value)}
                      >
                        <SelectTrigger className="h-8 w-full">
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
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={lineItem.description}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'description', value)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={lineItem.quantity}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'quantity', parseFloat(value) || 0)}
                      type="number"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={calculateTotalCost(lineItem)}
                      onChange={(value) => handleTotalCostChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      currency={true}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={calculateMarkupAmount(lineItem)}
                      onChange={(value) => handleMarkupAmountChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      currency={true}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={calculateMarkupPercent(lineItem)}
                      onChange={(value) => handleMarkupPercentChange(lineItem.id, parseFloat(value) || 0)}
                      type="number"
                      className={calculateMarkupPercent(lineItem) < 0 ? "text-destructive" : calculateMarkupPercent(lineItem) < 20 ? "text-muted-foreground" : "text-foreground"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    ${lineItem.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEditDetails(lineItem)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateLineItem(lineItem)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
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