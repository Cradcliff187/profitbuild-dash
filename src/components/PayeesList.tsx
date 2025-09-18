import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { markPayeeAsSynced, resetPayeeSyncStatus } from "@/utils/syncUtils";
import type { Payee } from "@/types/payee";
import { PayeeType } from "@/types/payee";
import { differenceInDays } from "date-fns";

interface PayeesListProps {
  onEdit: (payee: Payee) => void;
  refresh: boolean;
  onRefreshComplete: () => void;
}

export const PayeesList = ({ onEdit, refresh, onRefreshComplete }: PayeesListProps) => {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const getPayeeTypeBadgeVariant = (payeeType: string) => {
    switch (payeeType) {
      case PayeeType.SUBCONTRACTOR:
        return "default"; // blue
      case PayeeType.MATERIAL_SUPPLIER:
        return "secondary"; // green
      case PayeeType.EQUIPMENT_RENTAL:
        return "outline"; // orange  
      case PayeeType.INTERNAL_LABOR:
        return "default"; // purple
      case PayeeType.MANAGEMENT:
        return "secondary"; // gray
      case PayeeType.PERMIT_AUTHORITY:
        return "destructive"; // red
      case PayeeType.OTHER:
      default:
        return "outline";
    }
  };

  const getPayeeTypeColor = (payeeType: string) => {
    switch (payeeType) {
      case PayeeType.MATERIAL_SUPPLIER:
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800";
      case PayeeType.EQUIPMENT_RENTAL:
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800";
      case PayeeType.INTERNAL_LABOR:
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800";
      case PayeeType.MANAGEMENT:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-800";
      default:
        return "";
    }
  };

  const isInsuranceExpiringSoon = (expirationDate: string) => {
    if (!expirationDate) return false;
    const daysUntilExpiration = differenceInDays(new Date(expirationDate), new Date());
    return daysUntilExpiration <= 30 && daysUntilExpiration >= 0;
  };

  const fetchPayees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("payees")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name");

      if (error) throw error;
      setPayees(data as Payee[] || []);
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
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Business Info</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payees.map((payee) => (
                <TableRow key={payee.id}>
                  <TableCell className="font-medium">{payee.vendor_name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getPayeeTypeBadgeVariant(payee.payee_type)} 
                      className={getPayeeTypeColor(payee.payee_type)}
                    >
                      {(() => {
                        switch (payee.payee_type) {
                          case PayeeType.SUBCONTRACTOR:
                            return "Subcontractor";
                          case PayeeType.MATERIAL_SUPPLIER:
                            return "Material Supplier";
                          case PayeeType.EQUIPMENT_RENTAL:
                            return "Equipment Rental";
                          case PayeeType.INTERNAL_LABOR:
                            return "Internal Labor";
                          case PayeeType.MANAGEMENT:
                            return "Management";
                          case PayeeType.PERMIT_AUTHORITY:
                            return "Permit Authority";
                          case PayeeType.OTHER:
                            return "Other";
                          default:
                            return payee.payee_type || "Subcontractor";
                        }
                      })()}
                    </Badge>
                  </TableCell>
                  <TableCell>{payee.email || "-"}</TableCell>
                  <TableCell>{payee.phone_numbers || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {payee.provides_labor && (
                        <Badge variant="outline" className="text-xs">Labor</Badge>
                      )}
                      {payee.provides_materials && (
                        <Badge variant="outline" className="text-xs">Materials</Badge>
                      )}
                      {payee.requires_1099 && (
                        <Badge variant="outline" className="text-xs">1099</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {payee.license_number && (
                        <div className="text-muted-foreground">License: {payee.license_number}</div>
                      )}
                      {payee.hourly_rate && (
                        <div className={
                          payee.payee_type === PayeeType.INTERNAL_LABOR 
                            ? "font-medium text-primary" 
                            : "text-muted-foreground"
                        }>
                          ${payee.hourly_rate}/hr
                          {payee.payee_type === PayeeType.INTERNAL_LABOR && (
                            <span className="text-xs text-muted-foreground ml-1">(Internal)</span>
                          )}
                        </div>
                      )}
                      {payee.permit_issuer && <Badge variant="secondary" className="text-xs">Permit Issuer</Badge>}
                      {payee.insurance_expires && (
                        <div className={`text-xs flex items-center gap-1 ${
                          isInsuranceExpiringSoon(payee.insurance_expires)
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }`}>
                          {isInsuranceExpiringSoon(payee.insurance_expires) && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          Insurance expires: {new Date(payee.insurance_expires).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
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