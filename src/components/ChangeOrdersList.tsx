import React, { useState, useEffect } from 'react';
import { Edit, Trash2, CheckCircle, X, MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChangeOrderStatusBadge, ChangeOrderStatus } from './ChangeOrderStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { usePagination } from '@/hooks/usePagination';
import { CompletePagination } from '@/components/ui/complete-pagination';

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

interface ChangeOrdersListProps {
  projectId: string;
  projectContingencyRemaining?: number;
  onEdit?: (changeOrder: ChangeOrder) => void;
  onCreateNew?: () => void;
  enablePagination?: boolean;
  pageSize?: number;
}

export const ChangeOrdersList: React.FC<ChangeOrdersListProps> = ({ 
  projectId,
  projectContingencyRemaining = 0,
  onEdit, 
  onCreateNew,
  enablePagination = false,
  pageSize = 20
}) => {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchChangeOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          *,
          projects!inner(project_number, project_name)
        `)
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
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to approve change orders.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('change_orders')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: user.id
        })
        .eq('id', changeOrder.id);

      if (error) throw error;

      setChangeOrders(prev => prev.map(co => 
        co.id === changeOrder.id 
          ? { ...co, status: 'approved', approved_date: new Date().toISOString().split('T')[0], approved_by: user.id }
          : co
      ));
      
      toast({
        title: "Change Order Approved",
        description: `${changeOrder.change_order_number} approved. Use "Match Expenses" to track actual costs.`,
      });
    } catch (error) {
      console.error('Error approving change order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve change order.",
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
  const approvedChangeOrders = changeOrders.filter(co => co.status === 'approved');
  const totalClientAmount = approvedChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
  const totalCostImpact = approvedChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
  const totalMarginImpact = approvedChangeOrders.reduce((sum, co) => sum + (co.margin_impact || 0), 0);
  const overallMarginPercentage = totalClientAmount > 0 ? (totalMarginImpact / totalClientAmount) * 100 : 0;
  const totalContingencyBilled = approvedChangeOrders.reduce((sum, co) => sum + (co.contingency_billed_to_client || 0), 0);

  // Pagination
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination({
    totalItems: changeOrders.length,
    pageSize,
    initialPage: 1,
  });

  const paginatedChangeOrders = enablePagination 
    ? changeOrders.slice(startIndex, endIndex)
    : changeOrders;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="text-center text-sm">Loading change orders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Change Orders</CardTitle>
            {onCreateNew && (
              <Button onClick={onCreateNew} size="sm">
                Create New Change Order
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {/* Change Orders Table */}
          {changeOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <h3 className="text-lg font-semibold mb-2">No change orders found</h3>
              <p>No change orders have been created for this project yet.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead className="text-xs font-medium">Change Order #</TableHead>
                  <TableHead className="text-xs font-medium">Description</TableHead>
                  <TableHead className="text-right text-xs font-medium">Client Amount</TableHead>
                  <TableHead className="text-right text-xs font-medium">Cost Impact</TableHead>
                  <TableHead className="text-right text-xs font-medium">Margin $</TableHead>
                  <TableHead className="text-right text-xs font-medium">Margin %</TableHead>
                  <TableHead className="text-right text-xs font-medium">Contingency Billed</TableHead>
                  <TableHead className="text-xs font-medium">Status</TableHead>
                  <TableHead className="text-center text-xs font-medium">Matched</TableHead>
                  <TableHead className="text-xs font-medium">Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedChangeOrders.map((changeOrder) => (
                    <TableRow key={changeOrder.id}>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {(changeOrder as any).projects?.project_number} / {changeOrder.change_order_number}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(changeOrder as any).projects?.project_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="max-w-xs truncate" title={changeOrder.description}>
                          {changeOrder.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono tabular-nums">
                        {changeOrder.client_amount ? 
                          formatCurrency(changeOrder.client_amount) : 
                          <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono tabular-nums">
                        {changeOrder.cost_impact ? 
                          formatCurrency(changeOrder.cost_impact) : 
                          <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {changeOrder.margin_impact !== null && changeOrder.margin_impact !== undefined ? (
                          <span className={`font-medium text-xs font-mono tabular-nums ${
                            changeOrder.margin_impact >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(changeOrder.margin_impact, { showCents: false })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {changeOrder.client_amount > 0 && changeOrder.margin_impact !== null && changeOrder.margin_impact !== undefined ? (
                          <span className={`font-medium text-xs font-mono tabular-nums ${
                            changeOrder.margin_impact >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {((changeOrder.margin_impact / changeOrder.client_amount) * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {changeOrder.contingency_billed_to_client && changeOrder.contingency_billed_to_client > 0 ? (
                          <span className="text-xs font-mono tabular-nums text-blue-700">
                            {formatCurrency(changeOrder.contingency_billed_to_client, { showCents: false })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChangeOrderStatusBadge status={changeOrder.status as ChangeOrderStatus} />
                      </TableCell>
                      <TableCell className="text-center">
                        {changeOrder.status === 'approved' ? (
                          <Badge variant="outline" className="text-xs">0%</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {changeOrder.requested_date ? 
                          format(new Date(changeOrder.requested_date), 'MMM dd') : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {changeOrder.status === 'pending' && (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                      Approve
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Approve Change Order</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to approve change order {changeOrder.change_order_number} for {formatCurrency(changeOrder.client_amount || 0, { showCents: true })}?
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
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <X className="h-4 w-4 mr-2 text-red-600" />
                                      Reject
                                    </DropdownMenuItem>
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
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(changeOrder)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {changeOrder.status === 'approved' && (
                              <DropdownMenuItem onClick={() => navigate('/expenses?tab=matching')}>
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Match Expenses
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Enhanced Change Orders Summary */}
          {changeOrders.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Change Orders Profit Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-0.5">Total Client Amount</p>
                    <p className="text-lg font-bold text-green-600 font-mono tabular-nums">
                      {formatCurrency(totalClientAmount, { showCents: false })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Approved change orders</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-0.5">Total Cost Impact</p>
                    <p className="text-lg font-bold text-orange-600 font-mono tabular-nums">
                      {formatCurrency(totalCostImpact, { showCents: false })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Our costs</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-0.5">Net Profit Impact</p>
                    <p className={`text-lg font-bold font-mono tabular-nums ${totalMarginImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalMarginImpact, { showCents: false })}
                    </p>
                    <p className={`text-xs font-medium font-mono tabular-nums ${
                      overallMarginPercentage >= 20 ? 'text-green-600' : 
                      overallMarginPercentage >= 10 ? 'text-green-500' : 
                      overallMarginPercentage >= 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {overallMarginPercentage.toFixed(1)}% margin
                    </p>
                  </div>
                  <div className="text-center p-3 border rounded-lg bg-blue-50">
                    <p className="text-xs text-muted-foreground mb-0.5">Remaining Contingency</p>
                    <p className="text-lg font-bold text-blue-700 font-mono tabular-nums">
                      {formatCurrency(projectContingencyRemaining - totalContingencyBilled, { showCents: false })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Available for future COs
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t">
                  <span>
                    {approvedChangeOrders.length} of {changeOrders.length} change orders approved
                  </span>
                  {totalContingencyBilled > 0 && (
                    <span className="text-blue-600 font-medium">
                      {formatCurrency(totalContingencyBilled, { showCents: false })} contingency billed
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {enablePagination && changeOrders.length > pageSize && (
            <div className="flex justify-center mt-4">
              <CompletePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};