import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Filter, FileText, Eye, Download, Trash2 } from 'lucide-react';
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
import { MobileListCard } from '@/components/ui/mobile-list-card';
import { DocumentLeadingIcon } from '@/utils/documentFileType';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { DocumentPreviewModals } from '@/components/documents/DocumentPreviewModals';
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

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

// Quote status color helper
function getQuoteStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'accepted': return 'bg-emerald-100 text-emerald-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function ProjectQuotePDFsList({ projectId }: ProjectQuotePDFsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const queryClient = useQueryClient();
  const preview = useDocumentPreview();
  
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

  const handleDownload = (quote: Quote & { payees: { payee_name: string } | null }) => {
    if (!quote.attachment_url) return;
    const a = document.createElement('a');
    a.href = quote.attachment_url;
    a.download = `Quote-${quote.quote_number}.pdf`;
    a.click();
    toast.success("Download started", { description: "Your PDF is being downloaded" });
  };

  const handleDelete = async () => {
    if (!quoteToDelete) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteToDelete.id);

      if (error) throw error;

      toast.success("Quote deleted", { description: "Quote removed successfully" });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Delete error:', error);
      }
      toast.error("Delete failed", { description: error instanceof Error ? error.message : "Failed to delete quote" });
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
        <Input
          placeholder="Search quotes..."
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
          {/* Quote Cards - shown on all screen sizes */}
          <div className="space-y-2">
            {filteredQuotes.map((quote) => (
              <MobileListCard
                key={quote.id}
                leading={<DocumentLeadingIcon documentType="other" />}
                title={quote.quote_number}
                subtitle={quote.payees?.payee_name || 'Unknown'}
                badge={{
                  label: quote.status.charAt(0).toUpperCase() + quote.status.slice(1),
                  className: getQuoteStatusColor(quote.status),
                }}
                secondaryBadge={{
                  label: 'Quote PDF',
                  className: '',
                }}
                metrics={[
                  { label: 'Amount', value: formatCurrency(quote.total_amount) },
                  {
                    label: 'Received',
                    value: format(parseISO(quote.date_received), 'MMM d, yyyy'),
                  },
                ]}
                onTap={() => {
                  if (quote.attachment_url) {
                    preview.openPreview({
                      fileUrl: quote.attachment_url,
                      fileName: `Quote-${quote.quote_number}.pdf`,
                      mimeType: 'application/pdf',
                    });
                  }
                }}
                actions={[
                  {
                    icon: Eye,
                    label: 'View',
                    onClick: (e) => {
                      e.stopPropagation();
                      if (quote.attachment_url) {
                        preview.openPreview({
                          fileUrl: quote.attachment_url,
                          fileName: `Quote-${quote.quote_number}.pdf`,
                          mimeType: 'application/pdf',
                        });
                      }
                    },
                  },
                  {
                    icon: Download,
                    label: 'Download',
                    onClick: (e) => {
                      e.stopPropagation();
                      handleDownload(quote);
                    },
                  },
                  {
                    icon: Trash2,
                    label: 'Delete',
                    variant: 'destructive' as const,
                    onClick: (e) => {
                      e.stopPropagation();
                      setQuoteToDelete(quote);
                      setDeleteDialogOpen(true);
                    },
                  },
                ]}
              />
            ))}
          </div>
        </>
      )}

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

      <DocumentPreviewModals preview={preview} />
    </div>
  );
}
