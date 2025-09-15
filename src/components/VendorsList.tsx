import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@/types/vendor";

interface VendorsListProps {
  onEdit: (vendor: Vendor) => void;
  refresh: boolean;
  onRefreshComplete: () => void;
}

export const VendorsList = ({ onEdit, refresh, onRefreshComplete }: VendorsListProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (refresh) {
      fetchVendors();
      onRefreshComplete();
    }
  }, [refresh, onRefreshComplete]);

  const handleDelete = async (vendorId: string) => {
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: false })
        .eq("id", vendorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });

      fetchVendors();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading vendors...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        {vendors.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No vendors found. Add your first vendor to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                  <TableCell>{vendor.email || "-"}</TableCell>
                  <TableCell>{vendor.phone_numbers || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(vendor)}
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
                            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{vendor.vendor_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vendor.id)}>
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