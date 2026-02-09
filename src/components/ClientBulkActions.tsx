import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientType, CLIENT_TYPES } from "@/types/client";
import { toast } from "sonner";
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

interface ClientBulkActionsProps {
  selectedClientIds: string[];
  onSelectionChange: (selection: Set<string>) => void;
  onComplete: () => void;
}

export const ClientBulkActions = ({ 
  selectedClientIds, 
  onSelectionChange, 
  onComplete 
}: ClientBulkActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [bulkClientType, setBulkClientType] = useState<ClientType>("residential");

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", selectedClientIds);

      if (error) throw error;

      toast.success(`${selectedClientIds.length} clients deleted successfully`);
      
      onSelectionChange(new Set());
      onComplete();
    } catch (error) {
      console.error("Error deleting clients:", error);
      toast.error("Failed to delete clients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdateType = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ client_type: bulkClientType })
        .in("id", selectedClientIds);

      if (error) throw error;

      toast.success(`${selectedClientIds.length} clients updated successfully`);
      
      onSelectionChange(new Set());
      onComplete();
    } catch (error) {
      console.error("Error updating clients:", error);
      toast.error("Failed to update client types");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkToggleStatus = async (activate: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: activate })
        .in("id", selectedClientIds);

      if (error) throw error;

      toast.success(`${selectedClientIds.length} clients ${activate ? 'activated' : 'deactivated'} successfully`);
      
      onSelectionChange(new Set());
      onComplete();
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Failed to update client status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-muted border rounded-md">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Users className="h-4 w-4 shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate">
          {selectedClientIds.length} {selectedClientIds.length === 1 ? 'client' : 'clients'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange(new Set())}
          className="h-7 w-7 p-0 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <Select value={bulkClientType} onValueChange={(value: ClientType) => setBulkClientType(value)}>
            <SelectTrigger className="h-7 w-[120px] sm:w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
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

        <Button
          onClick={() => handleBulkToggleStatus(true)}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="h-7 text-xs"
        >
          Activate
        </Button>

        <Button
          onClick={() => handleBulkToggleStatus(false)}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="h-7 text-xs"
        >
          Deactivate
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isLoading} className="h-7 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Clients</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedClientIds.length} selected clients? 
                This action cannot be undone and may affect related projects.
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