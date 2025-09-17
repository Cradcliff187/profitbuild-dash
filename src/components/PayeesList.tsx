import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { markPayeeAsSynced, resetPayeeSyncStatus } from "@/utils/syncUtils";
import type { Payee } from "@/types/payee";

interface PayeesListProps {
  onEdit: (payee: Payee) => void;
  refresh: boolean;
  onRefreshComplete: () => void;
}

export const PayeesList = ({ onEdit, refresh, onRefreshComplete }: PayeesListProps) => {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("payees")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name");

      if (error) throw error;
      setPayees(data || []);
    } catch (error) {
      console.error("Error fetching payees:", error);
      toast({
        title: "Error",
        description: "Failed to load payees",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayees();
  }, []);

  useEffect(() => {
    if (refresh) {
      fetchPayees();
      onRefreshComplete();
    }
  }, [refresh, onRefreshComplete]);

  const handleDelete = async (payeeId: string) => {
    try {
      const { error } = await supabase
        .from("payees")
        .update({ is_active: false })
        .eq("id", payeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payee deleted successfully",
      });

      fetchPayees();
    } catch (error) {
      console.error("Error deleting payee:", error);
      toast({
        title: "Error",
        description: "Failed to delete payee",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsSynced = async (payeeId: string) => {
    try {
      const { error } = await markPayeeAsSynced(payeeId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Payee marked as synced",
      });

      fetchPayees();
    } catch (error) {
      console.error("Error marking payee as synced:", error);
      toast({
        title: "Error",
        description: "Failed to mark payee as synced",
        variant: "destructive",
      });
    }
  };

  const handleResetSync = async (payeeId: string) => {
    try {
      const { error } = await resetPayeeSyncStatus(payeeId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Sync status reset",
      });

      fetchPayees();
    } catch (error) {
      console.error("Error resetting sync status:", error);
      toast({
        title: "Error",
        description: "Failed to reset sync status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading payees...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payees</CardTitle>
      </CardHeader>
      <CardContent>
        {payees.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No payees found. Add your first payee to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payee Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payees.map((payee) => (
                <TableRow key={payee.id}>
                  <TableCell className="font-medium">{payee.vendor_name}</TableCell>
                  <TableCell>{payee.email || "-"}</TableCell>
                  <TableCell>{payee.phone_numbers || "-"}</TableCell>
                  <TableCell>
                    <SyncStatusBadge
                      status={payee.sync_status}
                      lastSyncedAt={payee.last_synced_at}
                      showActions={true}
                      onMarkAsSynced={() => handleMarkAsSynced(payee.id)}
                      onResetSync={() => handleResetSync(payee.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(payee)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Payee</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{payee.vendor_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(payee.id)}>
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
        )}
      </CardContent>
    </Card>
  );
};