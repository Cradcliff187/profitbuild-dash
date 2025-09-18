import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientType, CLIENT_TYPES } from "@/types/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", selectedClientIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedClientIds.length} clients deleted successfully`,
      });
      
      onSelectionChange(new Set());
      onComplete();
    } catch (error) {
      console.error("Error deleting clients:", error);
      toast({
        title: "Error",
        description: "Failed to delete clients",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: `${selectedClientIds.length} clients updated successfully`,
      });
      
      onSelectionChange(new Set());
      onComplete();
    } catch (error) {
      console.error("Error updating clients:", error);
      toast({
        title: "Error",
        description: "Failed to update client types",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: `${selectedClientIds.length} clients ${activate ? 'activated' : 'deactivated'} successfully`,
      });
      
      onSelectionChange(new Set());
      onComplete();
    } catch (error) {
      console.error("Error updating client status:", error);
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">{selectedClientIds.length} clients selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Select value={bulkClientType} onValueChange={(value: ClientType) => setBulkClientType(value)}>
                <SelectTrigger className="w-[140px]">
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
              >
                Update Type
              </Button>
            </div>

            <Button
              onClick={() => handleBulkToggleStatus(true)}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              Activate
            </Button>

            <Button
              onClick={() => handleBulkToggleStatus(false)}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              Deactivate
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
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
      </CardContent>
    </Card>
  );
};