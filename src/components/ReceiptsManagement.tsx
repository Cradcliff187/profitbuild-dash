import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image, Download, Trash2, Search, FileImage, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { downloadSingleReceipt, downloadReceiptsAsZip } from '@/utils/receiptDownloadUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UnifiedReceipt {
  id: string;
  type: 'time_entry' | 'standalone';
  image_url: string;
  payee_name: string;
  project_number: string;
  project_name: string;
  date: string;
  amount: number;
  description?: string;
  hours?: number;
}

export const ReceiptsManagement: React.FC = () => {
  const [allReceipts, setAllReceipts] = useState<UnifiedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  // Real-time updates for receipts
  useEffect(() => {
    const channel = supabase
      .channel('receipts-realtime-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: 'category=eq.labor_internal'
      }, () => {
        console.log('Time entry receipt updated');
        loadReceipts();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts'
      }, () => {
        console.log('Standalone receipt updated');
        loadReceipts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // Fetch both types in parallel
      const [timeEntryResult, standaloneResult] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            id,
            expense_date,
            amount,
            attachment_url,
            start_time,
            end_time,
            payees!inner(payee_name),
            projects!inner(project_number, project_name)
          `)
          .eq('category', 'labor_internal')
          .not('attachment_url', 'is', null)
          .order('expense_date', { ascending: false }),
        
        supabase
          .from('receipts')
          .select(`
            id,
            image_url,
            amount,
            description,
            captured_at,
            payees(payee_name),
            projects(project_number, project_name)
          `)
          .order('captured_at', { ascending: false })
      ]);

      if (timeEntryResult.error) throw timeEntryResult.error;
      if (standaloneResult.error) throw standaloneResult.error;

      // Transform time entry receipts
      const timeEntryReceipts: UnifiedReceipt[] = (timeEntryResult.data || []).map((expense: any) => {
        const hours = expense.start_time && expense.end_time
          ? (new Date(expense.end_time).getTime() - new Date(expense.start_time).getTime()) / (1000 * 60 * 60)
          : 0;

        return {
          id: expense.id,
          type: 'time_entry' as const,
          image_url: expense.attachment_url,
          payee_name: expense.payees?.payee_name || 'Unknown',
          project_number: expense.projects?.project_number || '',
          project_name: expense.projects?.project_name || '',
          date: expense.expense_date,
          amount: expense.amount,
          hours,
        };
      });

      // Transform standalone receipts
      const standaloneReceipts: UnifiedReceipt[] = (standaloneResult.data || []).map((receipt: any) => ({
        id: receipt.id,
        type: 'standalone' as const,
        image_url: receipt.image_url,
        payee_name: receipt.payees?.payee_name || 'Unknown',
        project_number: receipt.projects?.project_number || 'SYS-000',
        project_name: receipt.projects?.project_name || 'Unassigned',
        date: receipt.captured_at,
        amount: receipt.amount,
        description: receipt.description || '',
      }));

      // Merge and sort by date (most recent first)
      const unified = [...timeEntryReceipts, ...standaloneReceipts]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllReceipts(unified);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (receipt: UnifiedReceipt) => {
    setSelectedReceiptUrl(receipt.image_url);
    setPreviewDetails({
      payee: receipt.payee_name,
      project: `${receipt.project_number} - ${receipt.project_name}`,
      date: format(new Date(receipt.date), 'MMM dd, yyyy'),
      amount: `$${receipt.amount.toFixed(2)}`,
      ...(receipt.hours !== undefined && { hours: `${receipt.hours.toFixed(2)} hrs` }),
    });
    setPreviewOpen(true);
  };

  const handleDeleteReceipt = async (receiptId: string, receiptType: 'time_entry' | 'standalone') => {
    // Only allow deletion of standalone receipts
    if (receiptType !== 'standalone') {
      toast.error('Cannot delete time entry receipts');
      return;
    }

    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('Receipt deleted');
      loadReceipts();
    } catch (error) {
      toast.error('Failed to delete receipt');
    }
  };

  const handleBulkDownload = async () => {
    try {
      if (filteredReceipts.length === 0) {
        toast.error('No receipts to download');
        return;
      }

      toast.success(`Downloading ${filteredReceipts.length} receipts...`);
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `all_receipts_${dateStr}.zip`;

      const receiptsToDownload = filteredReceipts.map(r => ({
        id: r.id,
        attachment_url: r.image_url,
        worker_name: r.payee_name,
        project_number: r.project_number,
        expense_date: r.date,
        hours: r.hours || 0,
      }));
      
      await downloadReceiptsAsZip(receiptsToDownload, filename);
      toast.success('Download complete');
    } catch (error) {
      toast.error('Failed to download receipts');
    }
  };

  // Filter receipts based on search
  const filteredReceipts = allReceipts.filter(r => {
    const search = searchTerm.toLowerCase();
    return (
      r.payee_name.toLowerCase().includes(search) ||
      r.project_number.toLowerCase().includes(search) ||
      r.project_name.toLowerCase().includes(search) ||
      (r.description && r.description.toLowerCase().includes(search)) ||
      format(new Date(r.date), 'MMM dd, yyyy').toLowerCase().includes(search) ||
      r.type.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner variant="spinner" size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Receipt Management</h3>
          <p className="text-xs text-muted-foreground">
            View and manage all receipts from time entries and standalone uploads
          </p>
        </div>
        <Button onClick={handleBulkDownload} variant="outline" size="sm">
          <FileImage className="w-3 h-3 mr-2" />
          Download All ({filteredReceipts.length})
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder="Search receipts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-7 h-8 text-sm"
        />
      </div>

      {/* Single Unified Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="w-12 text-xs">Preview</TableHead>
                <TableHead className="w-24 text-xs">Type</TableHead>
                <TableHead className="text-xs">Payee/Worker</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-right text-xs">Amount</TableHead>
                <TableHead className="text-xs max-w-xs">Description</TableHead>
                <TableHead className="text-right text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="h-9 hover:bg-muted/50 even:bg-muted/20">
                    {/* Preview Button */}
                    <TableCell className="p-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleViewReceipt(receipt)}
                      >
                        <Image className="h-3 w-3 text-blue-600" />
                      </Button>
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell className="p-1.5">
                      <Badge 
                        variant={receipt.type === 'time_entry' ? 'default' : 'secondary'}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {receipt.type === 'time_entry' ? 'Time Entry' : 'Standalone'}
                      </Badge>
                    </TableCell>

                    {/* Payee/Worker */}
                    <TableCell className="p-1.5 font-medium text-xs">
                      {receipt.payee_name}
                    </TableCell>

                    {/* Project */}
                    <TableCell className="p-1.5">
                      <div className="text-xs">
                        <div className="font-medium">{receipt.project_number}</div>
                        <div className="text-muted-foreground text-[10px]">{receipt.project_name}</div>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="p-1.5 text-xs">
                      {format(new Date(receipt.date), 'MMM dd, yyyy')}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="p-1.5 text-right font-semibold text-xs">
                      ${receipt.amount.toFixed(2)}
                    </TableCell>

                    {/* Description */}
                    <TableCell className="p-1.5 text-xs text-muted-foreground max-w-xs truncate">
                      {receipt.type === 'time_entry' && receipt.hours !== undefined
                        ? `${receipt.hours.toFixed(2)} hrs`
                        : receipt.description || '-'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-1.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewReceipt(receipt)}>
                            <Image className="h-3 w-3 mr-2" />
                            View Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            const filename = `receipt_${receipt.payee_name}_${format(new Date(receipt.date), 'yyyy-MM-dd')}.jpg`;
                            try {
                              await downloadSingleReceipt(receipt.image_url, filename);
                              toast.success('Receipt downloaded');
                            } catch (error) {
                              toast.error('Failed to download receipt');
                            }
                          }}>
                            <Download className="h-3 w-3 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {receipt.type === 'standalone' && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteReceipt(receipt.id, receipt.type)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <ReceiptPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        receiptUrl={selectedReceiptUrl}
        timeEntryDetails={previewDetails}
      />
    </div>
  );
};
