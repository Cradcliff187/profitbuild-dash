import React, { useState } from 'react';
import { Edit, Trash2, Copy, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
}> = ({ value, onChange, type = 'text', className = '' }) => {
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
      />
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-muted/50 border border-input bg-background px-3 py-2 rounded-md min-h-[32px] flex items-center text-sm"
      onClick={() => {
        setEditValue(String(value));
        setIsEditing(true);
      }}
    >
      {value ? (
        type === 'number' && typeof value === 'number' ? value.toLocaleString() : value
      ) : (
        <span className="text-muted-foreground">Click to edit</span>
      )}
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
  const calculateMarginPercent = (lineItem: LineItem): number => {
    const pricePerUnit = lineItem.pricePerUnit || lineItem.costPerUnit;
    if (pricePerUnit <= 0) return 0;
    return ((pricePerUnit - lineItem.costPerUnit) / pricePerUnit) * 100;
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <Button onClick={onAddLineItem} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Line Item
        </Button>
      </div>

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
                <TableHead className="w-[100px]">Unit</TableHead>
                <TableHead className="w-[100px]">Price/Unit</TableHead>
                <TableHead className="w-[100px]">Total</TableHead>
                <TableHead className="w-[80px]">Margin%</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
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
                      value={lineItem.unit || ''}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'unit', value)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={lineItem.pricePerUnit || lineItem.costPerUnit}
                      onChange={(value) => onUpdateLineItem(lineItem.id, 'pricePerUnit', parseFloat(value) || 0)}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    ${lineItem.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={calculateMarginPercent(lineItem) < 10 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {calculateMarginPercent(lineItem).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditDetails(lineItem)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateLineItem(lineItem)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
                    </div>
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