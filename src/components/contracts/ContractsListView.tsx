import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { Contract } from '@/types/contract';

interface ContractsListViewProps {
  projectId: string;
}

export function ContractsListView({ projectId }: ContractsListViewProps) {
  const [contracts, setContracts] = useState<(Contract & { payee_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!projectId) return;
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            *,
            payees(payee_name)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const rows = (data || []).map((row: Record<string, unknown>) => ({
          ...row,
          payee_name: (row.payees as { payee_name?: string } | null)?.payee_name
            ?? (row.field_values as { subcontractor?: { company?: string } })?.subcontractor?.company
            ?? '—',
        })) as unknown as (Contract & { payee_name?: string })[];
        setContracts(rows);
      } catch (err) {
        console.error('Error fetching contracts:', err);
        toast({
          title: 'Error',
          description: 'Failed to load contracts.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, [projectId, toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contracts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No contracts generated yet. Generate a Subcontractor Project Agreement from an accepted quote.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Subcontractor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Agreement date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{(c as { internal_reference?: string }).internal_reference || c.contract_number || '—'}</TableCell>
                  <TableCell>{c.payee_name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(c.subcontract_price)}
                  </TableCell>
                  <TableCell>
                    {c.agreement_date
                      ? format(new Date(c.agreement_date), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                    {c.docx_url && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(c.docx_url!)}`;
                            window.open(printUrl, '_blank');
                          }}
                          title="Print / Save as PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(c.docx_url!, '_blank')}
                          title="Download DOCX"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {c.pdf_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(c.pdf_url!, '_blank')}
                        title="Download PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
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
}
