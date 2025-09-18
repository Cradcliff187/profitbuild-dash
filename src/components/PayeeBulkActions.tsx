import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Users, X } from "lucide-react";
import { PayeeType } from "@/types/payee";
import type { Payee } from "@/types/payee";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateTypeDialog, setShowUpdateTypeDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<PayeeType | "">("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete(selectedPayees.map(p => p.id));
      setShowDeleteDialog(false);
      onClearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpdateType = async () => {
    if (!selectedType) return;
    
    setIsProcessing(true);
    try {
      await onBulkUpdateType(selectedPayees.map(p => p.id), selectedType as PayeeType);
      setShowUpdateTypeDialog(false);
      setSelectedType("");
      onClearSelection();
    } finally {
      setIsProcessing(false);
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
    <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg mb-6">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {selectedPayees.length} selected
        </Badge>
        <span className="text-sm text-muted-foreground">
          {selectedPayees.map(p => p.payee_name).join(", ")}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpdateTypeDialog(true)}
          disabled={isProcessing}
        >
          Update Type
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isProcessing}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Payees</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPayees.length} payee(s)? 
              This will deactivate: {selectedPayees.map(p => p.payee_name).join(", ")}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Type Dialog */}
      <AlertDialog open={showUpdateTypeDialog} onOpenChange={setShowUpdateTypeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Payee Type</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new type for {selectedPayees.length} selected payee(s):
              <div className="mt-2 text-sm font-medium">
                {selectedPayees.map(p => p.payee_name).join(", ")}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as PayeeType | "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select payee type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PayeeType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getPayeeTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkUpdateType}
              disabled={isProcessing || !selectedType}
            >
              {isProcessing ? "Updating..." : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};