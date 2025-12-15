import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users, X } from "lucide-react";
import { PayeeType } from "@/types/payee";
import type { Payee } from "@/types/payee";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PayeeBulkActionsProps {
  selectedPayees: Payee[];
  onBulkDelete: (payeeIds: string[]) => Promise<void>;
  onBulkUpdateType: (payeeIds: string[], payeeType: PayeeType) => Promise<void>;
  onClearSelection: () => void;
}

export const PayeeBulkActions = ({ 
  selectedPayees, 
  onBulkDelete, 
  onBulkUpdateType, 
  onClearSelection 
}: PayeeBulkActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [bulkPayeeType, setBulkPayeeType] = useState<PayeeType>(PayeeType.SUBCONTRACTOR);

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      await onBulkDelete(selectedPayees.map(p => p.id));
      onClearSelection();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdateType = async () => {
    setIsLoading(true);
    try {
      await onBulkUpdateType(selectedPayees.map(p => p.id), bulkPayeeType);
      onClearSelection();
    } finally {
      setIsLoading(false);
    }
  };

  const getPayeeTypeLabel = (type: PayeeType) => {
    switch (type) {
      case PayeeType.SUBCONTRACTOR: return "Subcontractor";
      case PayeeType.MATERIAL_SUPPLIER: return "Material Supplier";
      case PayeeType.EQUIPMENT_RENTAL: return "Equipment Rental";
      case PayeeType.INTERNAL_LABOR: return "Internal Labor";
      case PayeeType.MANAGEMENT: return "Management";
      case PayeeType.PERMIT_AUTHORITY: return "Permit Authority";
      case PayeeType.OTHER: return "Other";
      default: return type;
    }
  };

  if (selectedPayees.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-muted border rounded-md">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Users className="h-4 w-4 shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate">
          {selectedPayees.length} {selectedPayees.length === 1 ? 'payee' : 'payees'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 w-7 p-0 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <Select value={bulkPayeeType} onValueChange={(value: PayeeType) => setBulkPayeeType(value)}>
            <SelectTrigger className="h-7 w-[120px] sm:w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PayeeType).map((type) => (
                <SelectItem key={type} value={type}>
                  {getPayeeTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={handleBulkUpdateType}
            disabled={isLoading}
            size="sm"
            className="h-7 text-xs"
          >
            Update
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isLoading} className="h-7 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payees</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedPayees.length} selected payees? 
                This action cannot be undone and may affect related expenses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};