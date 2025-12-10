import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Eye, Download, Trash2, Filter, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { useToast } from '@/hooks/use-toast';

interface Receipt {
  id: string;
  image_url: string;
  amount: number;
  description: string | null;
  captured_at: string;
  approval_status: string | null;
  user_id: string;
  payee_id: string | null;
  user_name?: string;
  payee_name?: string;
}

interface ProjectReceiptsViewProps {
  projectId: string;
}

export function ProjectReceiptsView({ projectId }: ProjectReceiptsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ['project-receipts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('project_id', projectId)
        .order('captured_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and payees separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const payeeIds = [...new Set(data.filter(r => r.payee_id).map(r => r.payee_id!))];

      const [profilesResult, payeesResult] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', userIds) : null,
        payeeIds.length > 0 ? supabase.from('payees').select('id, payee_name').in('id', payeeIds) : null
      ]);

      const profilesMap = new Map<string, string>();
      profilesResult?.data?.forEach(p => profilesMap.set(p.id, p.full_name));

      const payeesMap = new Map<string, string>();
      payeesResult?.data?.forEach(p => payeesMap.set(p.id, p.payee_name));

      return data.map(receipt => ({
        ...receipt,
        user_name: profilesMap.get(receipt.user_id) || 'Unknown',
        payee_name: receipt.payee_id ? payeesMap.get(receipt.payee_id) || undefined : undefined
      }));
    },
  });

  // Real-time subscription for receipts
  useEffect(() => {
    const channel = supabase
      .channel(`project-receipts-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-receipts', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch = 
      receipt.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.amount.toString().includes(searchQuery) ||
      receipt.payee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && (!receipt.approval_status || receipt.approval_status === 'pending')) ||
      receipt.approval_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getApprovalBadge = (status: string | null) => {
    if (!status || status === 'pending') {
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="default" className="text-xs bg-green-500">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    }
    return null;
  };

  const handlePreview = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setPreviewDialogOpen(true);
  };

  const handleDownload = (receipt: Receipt) => {
    const a = document.createElement('a');
    a.href = receipt.image_url;
    a.download = `Receipt-${receipt.id}.jpg`;
    a.click();
    toast({
      title: 'Download started',
      description: 'Your receipt is being downloaded',
    });
  };

  const handleDelete = async () => {
    if (!receiptToDelete) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptToDelete.id);

      if (error) throw error;

      toast({
        title: 'Receipt deleted',
        description: 'Receipt removed successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete receipt',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading receipts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search receipts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9"
        />
        <div className="sm:w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <Receipt className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No receipts found</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Capture receipts from the field to track expenses'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredReceipts.map((receipt) => (
              <div key={receipt.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={receipt.image_url}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">${receipt.amount.toFixed(2)}</p>
                      {getApprovalBadge(receipt.approval_status)}
                    </div>
                    {receipt.description && (
                      <p className="text-xs text-muted-foreground truncate">{receipt.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{receipt.user_name}</p>
                    {receipt.payee_name && (
                      <p className="text-xs text-muted-foreground">{receipt.payee_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(receipt.captured_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(receipt)}
                    className="h-9 w-9 rounded-full"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(receipt)}
                    className="h-9 w-9 rounded-full"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReceiptToDelete(receipt);
                      setDeleteDialogOpen(true);
                    }}
                    className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium text-xs">Receipt</th>
                  <th className="p-2 text-right font-medium text-xs">Amount</th>
                  <th className="p-2 text-left font-medium text-xs">User</th>
                  <th className="p-2 text-left font-medium text-xs">Payee</th>
                  <th className="p-2 text-left font-medium text-xs">Date</th>
                  <th className="p-2 text-left font-medium text-xs">Status</th>
                  <th className="p-2 text-right font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={receipt.image_url}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          {receipt.description && (
                            <p className="truncate text-xs">{receipt.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right font-medium text-xs">
                      ${receipt.amount.toFixed(2)}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{receipt.user_name}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {receipt.payee_name || '-'}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(receipt.captured_at), { addSuffix: true })}
                    </td>
                    <td className="p-2">
                      {getApprovalBadge(receipt.approval_status)}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(receipt)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(receipt)}
                          className="h-7 w-7 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReceiptToDelete(receipt);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ReceiptPreviewModal
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        receiptUrl={selectedReceipt?.image_url || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receipt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
