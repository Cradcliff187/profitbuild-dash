import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image, Download, Trash2, Search, FileImage } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from 'lucide-react';

interface TimeEntryReceipt {
  id: string;
  attachment_url: string;
  worker_name: string;
  project_number: string;
  project_name: string;
  expense_date: string;
  hours: number;
  amount: number;
}

interface StandaloneReceipt {
  id: string;
  image_url: string;
  amount: number;
  payee_name: string;
  project_number: string;
  project_name: string;
  description: string;
  captured_at: string;
}

const ReceiptsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'time-entries' | 'all-receipts'>('time-entries');
  const [timeEntryReceipts, setTimeEntryReceipts] = useState<TimeEntryReceipt[]>([]);
  const [standaloneReceipts, setStandaloneReceipts] = useState<StandaloneReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTimeEntryReceipts(), loadStandaloneReceipts()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeEntryReceipts = async () => {
    try {
      const { data, error } = await supabase
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
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((expense: any) => {
        const hours = expense.start_time && expense.end_time
          ? (new Date(expense.end_time).getTime() - new Date(expense.start_time).getTime()) / (1000 * 60 * 60)
          : 0;

        return {
          id: expense.id,
          attachment_url: expense.attachment_url,
          worker_name: expense.payees?.payee_name || 'Unknown',
          project_number: expense.projects?.project_number || '',
          project_name: expense.projects?.project_name || '',
          expense_date: expense.expense_date,
          hours,
          amount: expense.amount,
        };
      });

      setTimeEntryReceipts(formatted);
    } catch (error) {
      console.error('Failed to load time entry receipts:', error);
      toast.error('Failed to load time entry receipts');
    }
  };

  const loadStandaloneReceipts = async () => {
    try {
      const { data, error } = await supabase
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
        .order('captured_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((receipt: any) => ({
        id: receipt.id,
        image_url: receipt.image_url,
        amount: receipt.amount,
        payee_name: receipt.payees?.payee_name || 'Unknown',
        project_number: receipt.projects?.project_number || 'SYS-000',
        project_name: receipt.projects?.project_name || 'Unassigned',
        description: receipt.description || '',
        captured_at: receipt.captured_at,
      }));

      setStandaloneReceipts(formatted);
    } catch (error) {
      console.error('Failed to load standalone receipts:', error);
      toast.error('Failed to load standalone receipts');
    }
  };

  const handleViewTimeEntryReceipt = (receipt: TimeEntryReceipt) => {
    setSelectedReceiptUrl(receipt.attachment_url);
    setPreviewDetails({
      worker: receipt.worker_name,
      project: `${receipt.project_number} - ${receipt.project_name}`,
      date: format(new Date(receipt.expense_date), 'MMM dd, yyyy'),
      hours: `${receipt.hours.toFixed(2)} hrs`,
    });
    setPreviewOpen(true);
  };

  const handleViewStandaloneReceipt = (receipt: StandaloneReceipt) => {
    setSelectedReceiptUrl(receipt.image_url);
    setPreviewDetails({
      payee: receipt.payee_name,
      project: `${receipt.project_number} - ${receipt.project_name}`,
      date: format(new Date(receipt.captured_at), 'MMM dd, yyyy'),
      amount: `$${receipt.amount.toFixed(2)}`,
    });
    setPreviewOpen(true);
  };

  const handleDeleteStandaloneReceipt = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('Receipt deleted');
      loadStandaloneReceipts();
    } catch (error) {
      toast.error('Failed to delete receipt');
    }
  };

  const handleBulkDownload = async () => {
    try {
      const receiptsToDownload = activeTab === 'time-entries'
        ? filteredTimeEntryReceipts.map(r => ({
            id: r.id,
            attachment_url: r.attachment_url,
            worker_name: r.worker_name,
            project_number: r.project_number,
            expense_date: r.expense_date,
            hours: r.hours,
          }))
        : filteredStandaloneReceipts.map(r => ({
            id: r.id,
            attachment_url: r.image_url,
            worker_name: r.payee_name,
            project_number: r.project_number,
            expense_date: r.captured_at,
            hours: 0,
          }));

      if (receiptsToDownload.length === 0) {
        toast.error('No receipts to download');
        return;
      }

      toast.success(`Downloading ${receiptsToDownload.length} receipts...`);
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = activeTab === 'time-entries' 
        ? `time_entry_receipts_${dateStr}.zip`
        : `all_receipts_${dateStr}.zip`;
      
      await downloadReceiptsAsZip(receiptsToDownload, filename);
      toast.success('Download complete');
    } catch (error) {
      toast.error('Failed to download receipts');
    }
  };

  // Filter receipts based on search
  const filteredTimeEntryReceipts = timeEntryReceipts.filter(r => {
    const search = searchTerm.toLowerCase();
    return (
      r.worker_name.toLowerCase().includes(search) ||
      r.project_number.toLowerCase().includes(search) ||
      r.project_name.toLowerCase().includes(search) ||
      format(new Date(r.expense_date), 'MMM dd, yyyy').toLowerCase().includes(search)
    );
  });

  const filteredStandaloneReceipts = standaloneReceipts.filter(r => {
    const search = searchTerm.toLowerCase();
    return (
      r.payee_name.toLowerCase().includes(search) ||
      r.project_number.toLowerCase().includes(search) ||
      r.project_name.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search) ||
      format(new Date(r.captured_at), 'MMM dd, yyyy').toLowerCase().includes(search)
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
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Receipt Management</h2>
          <p className="text-xs text-muted-foreground">
            View and manage all receipts from time entries and standalone uploads
          </p>
        </div>
        <Button onClick={handleBulkDownload} variant="outline" size="sm">
          <FileImage className="w-3 h-3 mr-2" />
          Download All ({activeTab === 'time-entries' ? filteredTimeEntryReceipts.length : filteredStandaloneReceipts.length})
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="time-entries" className="text-xs">
            Time Entry Receipts ({timeEntryReceipts.length})
          </TabsTrigger>
          <TabsTrigger value="all-receipts" className="text-xs">
            All Receipts ({standaloneReceipts.length})
          </TabsTrigger>
        </TabsList>

        {/* Time Entry Receipts Tab */}
        <TabsContent value="time-entries">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="w-12 text-xs">Preview</TableHead>
                    <TableHead className="text-xs">Worker</TableHead>
                    <TableHead className="text-xs">Project</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-right text-xs">Hours</TableHead>
                    <TableHead className="text-right text-xs">Amount</TableHead>
                    <TableHead className="text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimeEntryReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                        No time entry receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTimeEntryReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="h-9">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleViewTimeEntryReceipt(receipt)}
                          >
                            <Image className="h-3 w-3 text-blue-600" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{receipt.worker_name}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div className="font-medium">{receipt.project_number}</div>
                            <div className="text-muted-foreground">{receipt.project_name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(receipt.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {receipt.hours.toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          ${receipt.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewTimeEntryReceipt(receipt)}>
                                <Image className="h-3 w-3 mr-2" />
                                View Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                const filename = `receipt_${receipt.worker_name}_${format(new Date(receipt.expense_date), 'yyyy-MM-dd')}.jpg`;
                                try {
                                  await downloadSingleReceipt(receipt.attachment_url, filename);
                                  toast.success('Receipt downloaded');
                                } catch (error) {
                                  toast.error('Failed to download receipt');
                                }
                              }}>
                                <Download className="h-3 w-3 mr-2" />
                                Download Receipt
                              </DropdownMenuItem>
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
        </TabsContent>

        {/* All Receipts Tab */}
        <TabsContent value="all-receipts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="w-12 text-xs">Preview</TableHead>
                    <TableHead className="text-xs">Payee</TableHead>
                    <TableHead className="text-xs">Project</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-right text-xs">Amount</TableHead>
                    <TableHead className="text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStandaloneReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                        No standalone receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStandaloneReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="h-9">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleViewStandaloneReceipt(receipt)}
                          >
                            <Image className="h-3 w-3 text-blue-600" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{receipt.payee_name}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div className="font-medium">{receipt.project_number}</div>
                            <div className="text-muted-foreground">{receipt.project_name}</div>
                          </div>
                          {receipt.project_number === 'SYS-000' && (
                            <Badge variant="outline" className="mt-1 text-xs">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {receipt.description || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(receipt.captured_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          ${receipt.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewStandaloneReceipt(receipt)}>
                                <Image className="h-3 w-3 mr-2" />
                                View Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                const filename = `receipt_${receipt.payee_name}_${format(new Date(receipt.captured_at), 'yyyy-MM-dd')}.jpg`;
                                try {
                                  await downloadSingleReceipt(receipt.image_url, filename);
                                  toast.success('Receipt downloaded');
                                } catch (error) {
                                  toast.error('Failed to download receipt');
                                }
                              }}>
                                <Download className="h-3 w-3 mr-2" />
                                Download Receipt
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteStandaloneReceipt(receipt.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete Receipt
                              </DropdownMenuItem>
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
        </TabsContent>
      </Tabs>

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

export default ReceiptsPanel;
