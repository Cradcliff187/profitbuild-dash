import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChangeOrderStatusBadge, ChangeOrderStatus } from './ChangeOrderStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

interface ChangeOrdersListProps {
  projectId: string;
  onEdit?: (changeOrder: ChangeOrder) => void;
  onCreateNew?: () => void;
}

export const ChangeOrdersList: React.FC<ChangeOrdersListProps> = ({ 
  projectId, 
  onEdit, 
  onCreateNew 
}) => {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchChangeOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('requested_date', { ascending: false });

      if (error) throw error;
      setChangeOrders(data || []);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      toast({
        title: "Error",
        description: "Failed to load change orders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchChangeOrders();
    }
  }, [projectId]);

  const filteredChangeOrders = changeOrders.filter(changeOrder => 
    changeOrder.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    changeOrder.change_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    changeOrder.reason_for_change?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('change_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setChangeOrders(prev => prev.filter(co => co.id !== id));
      toast({
        title: "Change Order Deleted",
        description: "The change order has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting change order:', error);
      toast({
        title: "Error",
        description: "Failed to delete change order.",
        variant: "destructive",
      });
    }
  };

  // Calculate total of approved changes
  const approvedTotal = filteredChangeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading change orders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Change Orders</CardTitle>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                Create New Change Order
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search change orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Change Orders Table */}
          {filteredChangeOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <h3 className="text-lg font-semibold mb-2">No change orders found</h3>
              <p>
                {changeOrders.length === 0 
                  ? "No change orders have been created for this project yet."
                  : "No change orders match your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change Order #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChangeOrders.map((changeOrder) => (
                    <TableRow key={changeOrder.id}>
                      <TableCell className="font-medium">
                        {changeOrder.change_order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{changeOrder.description}</p>
                          {changeOrder.reason_for_change && (
                            <p className="text-xs text-muted-foreground">
                              Reason: {changeOrder.reason_for_change}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(changeOrder.amount || 0).toLocaleString('en-US', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell>
                        <ChangeOrderStatusBadge status={changeOrder.status as ChangeOrderStatus} />
                      </TableCell>
                      <TableCell>
                        {changeOrder.requested_date 
                          ? new Date(changeOrder.requested_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {onEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(changeOrder)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Change Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete change order {changeOrder.change_order_number}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(changeOrder.id)}>
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

          {/* Total Approved Changes */}
          {filteredChangeOrders.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Approved Changes:</span>
                <span className="text-lg font-bold text-primary">
                  ${approvedTotal.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {filteredChangeOrders.filter(co => co.status === 'approved').length} of {filteredChangeOrders.length} change orders approved
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};