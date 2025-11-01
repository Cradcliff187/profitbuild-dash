import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return <Badge variant="default" className="text-xs bg-green-500">Accepted</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Pending</Badge>;
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading quote PDFs...</div>;
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No quote PDFs found for this project</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left p-2 font-medium text-xs">Quote Number</th>
            <th className="text-left p-2 font-medium text-xs">Payee</th>
            <th className="text-right p-2 font-medium text-xs">Amount</th>
            <th className="text-left p-2 font-medium text-xs">Date</th>
            <th className="text-left p-2 font-medium text-xs">Status</th>
            <th className="text-right p-2 font-medium text-xs">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {quotes.map((quote) => (
            <tr key={quote.id} className="hover:bg-muted/30 transition-colors">
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
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(quote.attachment_url!, '_blank')}
                    className="h-7 w-7 p-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
