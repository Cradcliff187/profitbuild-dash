import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Download, Trash2, Search, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  date_received: string;
  status: string;
  attachment_url: string | null;
  payee_id: string;
}

interface ProjectQuotePDFsListProps {
  projectId: string;
}

export function ProjectQuotePDFsList({ projectId }: ProjectQuotePDFsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['project-quote-pdfs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          payees:payee_id(payee_name)
        `)
        .eq('project_id', projectId)
        .not('attachment_url', 'is', null)
        .order('date_received', { ascending: false });

      if (error) throw error;
      return data as (Quote & {
        payees: { payee_name: string } | null;
      })[];
    },
  });

  // Real-time subscription for quotes
  useEffect(() => {
    const channel = supabase
      .channel(`project-quotes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-quote-pdfs', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = 
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.payees?.payee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.total_amount.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return <Badge variant="default" className="text-xs bg-green-500">Accepted</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Pending</Badge>;
  };

  const handlePreview = async (quote: Quote & { payees: { payee_name: string } | null }) => {
    if (!quote.attachment_url) return;
    
    try {
      const response = await fetch(quote.attachment_url);
      const blob = await response.blob();
      setPdfBlob(blob);
      setSelectedQuote(quote);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch PDF:', error);
      toast({
        title: 'Preview failed',
        description: 'Unable to load PDF preview',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (quote: Quote & { payees: { payee_name: string } | null }) => {
    if (!quote.attachment_url) return;
    const a = document.createElement('a');
    a.href = quote.attachment_url;
    a.download = `Quote-${quote.quote_number}.pdf`;
    a.click();
    toast({
      title: 'Download started',
      description: 'Your PDF is being downloaded',
    });
  };

  const handleDelete = async () => {
    if (!quoteToDelete) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteToDelete.id);

      if (error) throw error;

      toast({
        title: 'Quote deleted',
        description: 'Quote removed successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete quote',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading quote PDFs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border-border pl-10 text-sm shadow-sm sm:h-9"
          />
        </div>
        <div className="sm:w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No quote PDFs found</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Upload quote PDFs to track subcontractor bids'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredQuotes.map((quote) => (
              <div key={quote.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{quote.quote_number}</p>
                    <p className="text-xs text-muted-foreground">{quote.payees?.payee_name || 'Unknown'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-sm font-medium">${quote.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      {getStatusBadge(quote.status)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(quote.date_received), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(quote)}
                    className="h-9 w-9 rounded-full"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(quote)}
                    className="h-9 w-9 rounded-full"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuoteToDelete(quote);
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
                  <th className="p-2 text-left font-medium text-xs">Quote Number</th>
                  <th className="p-2 text-left font-medium text-xs">Payee</th>
                  <th className="p-2 text-right font-medium text-xs">Amount</th>
                  <th className="p-2 text-left font-medium text-xs">Date</th>
                  <th className="p-2 text-left font-medium text-xs">Status</th>
                  <th className="p-2 text-right font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-2 font-medium text-xs">{quote.quote_number}</td>
                    <td className="p-2 text-muted-foreground text-xs">
                      {quote.payees?.payee_name || 'Unknown'}
                    </td>
                    <td className="p-2 text-right font-medium text-xs">
                      ${quote.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-muted-foreground text-xs">
                      {formatDistanceToNow(parseISO(quote.date_received), { addSuffix: true })}
                    </td>
                    <td className="p-2">
                      {getStatusBadge(quote.status)}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(quote)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(quote)}
                          className="h-7 w-7 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQuoteToDelete(quote);
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

      <PdfPreviewModal
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        pdfBlob={pdfBlob}
        fileName={selectedQuote ? `Quote-${selectedQuote.quote_number}.pdf` : 'Quote.pdf'}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete quote "{quoteToDelete?.quote_number}"? This action cannot be undone.
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
