import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Search, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChangeOrderStatusBadge, ChangeOrderStatus } from './ChangeOrderStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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

  const handleApprove = async (changeOrder: ChangeOrder) => {
    try {
      const { error } = await supabase
        .from('change_orders')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: 'current-user-placeholder' // TODO: Replace with actual user ID when auth is implemented
        })
        .eq('id', changeOrder.id);

      if (error) throw error;

      setChangeOrders(prev => prev.map(co => 
        co.id === changeOrder.id 
          ? { ...co, status: 'approved', approved_date: new Date().toISOString().split('T')[0], approved_by: 'current-user-placeholder' }
          : co
      ));
      
      toast({
        title: "Change Order Approved",
        description: `Change Order ${changeOrder.change_order_number} has been approved.`,
      });
    } catch (error) {
      console.error('Error approving change order:', error);
      toast({
        title: "Error",
        description: "Failed to approve change order.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (changeOrder: ChangeOrder) => {
    try {
      const { error } = await supabase
        .from('change_orders')
        .update({
          status: 'rejected',
          approved_date: null,
          approved_by: null
        })
        .eq('id', changeOrder.id);

      if (error) throw error;

      setChangeOrders(prev => prev.map(co => 
        co.id === changeOrder.id 
          ? { ...co, status: 'rejected', approved_date: null, approved_by: null }
          : co
      ));
      
      toast({
        title: "Change Order Rejected",
        description: `Change Order ${changeOrder.change_order_number} has been rejected.`,
      });
    } catch (error) {
      console.error('Error rejecting change order:', error);
      toast({
        title: "Error",
        description: "Failed to reject change order.",
        variant: "destructive",
      });
    }
  };

  // Calculate totals for approved changes
  const approvedChangeOrders = filteredChangeOrders.filter(co => co.status === 'approved');
  const totalClientAmount = approvedChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
  const totalCostImpact = approvedChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
  const totalMarginImpact = approvedChangeOrders.reduce((sum, co) => sum + (co.margin_impact || 0), 0);
  const overallMarginPercentage = totalClientAmount > 0 ? (totalMarginImpact / totalClientAmount) * 100 : 0;

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
                  <TableHead>Client Amount</TableHead>
                  <TableHead>Cost Impact</TableHead>
                  <TableHead>Margin Impact</TableHead>
                  <TableHead>Contingency</TableHead>
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
                        <div className="max-w-xs truncate" title={changeOrder.description}>
                          {changeOrder.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {changeOrder.client_amount ? 
                          `$${changeOrder.client_amount.toFixed(2)}` : 
                          <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        {changeOrder.cost_impact ? 
                          `$${changeOrder.cost_impact.toFixed(2)}` : 
                          <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        {changeOrder.margin_impact !== null && changeOrder.margin_impact !== undefined && changeOrder.client_amount ? (
                          <div className="space-y-1">
                            <span className={`font-medium ${
                              changeOrder.margin_impact >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${changeOrder.margin_impact.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <div className={`text-xs ${
                              changeOrder.margin_impact >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {((changeOrder.margin_impact / changeOrder.client_amount) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {changeOrder.includes_contingency ? (
                          <Badge variant="outline" className="text-xs">
                            Uses Contingency
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChangeOrderStatusBadge status={changeOrder.status as ChangeOrderStatus} />
                      </TableCell>
                      <TableCell>
                        {changeOrder.requested_date ? 
                          format(new Date(changeOrder.requested_date), 'MMM dd, yyyy') : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {changeOrder.status === 'pending' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Approve Change Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to approve change order {changeOrder.change_order_number} for ${(changeOrder.client_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleApprove(changeOrder)}>
                                      Approve
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Change Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reject change order {changeOrder.change_order_number}? This action can be reversed later if needed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleReject(changeOrder)} className="bg-red-600 hover:bg-red-700">
                                      Reject
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
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

          {/* Enhanced Change Orders Summary */}
          {filteredChangeOrders.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Change Orders Profit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Client Amount</p>
                    <p className="text-xl font-bold text-green-600">
                      ${totalClientAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Approved change orders</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Cost Impact</p>
                    <p className="text-xl font-bold text-orange-600">
                      ${totalCostImpact.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Our costs</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Net Profit Impact</p>
                    <p className={`text-xl font-bold ${totalMarginImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${totalMarginImpact.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className={`text-sm font-medium ${
                      overallMarginPercentage >= 20 ? 'text-green-600' : 
                      overallMarginPercentage >= 10 ? 'text-green-500' : 
                      overallMarginPercentage >= 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {overallMarginPercentage.toFixed(1)}% margin
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t">
                  <span>
                    {approvedChangeOrders.length} of {filteredChangeOrders.length} change orders approved
                  </span>
                  {approvedChangeOrders.filter(co => co.includes_contingency).length > 0 && (
                    <span className="text-blue-600">
                      {approvedChangeOrders.filter(co => co.includes_contingency).length} using contingency
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};