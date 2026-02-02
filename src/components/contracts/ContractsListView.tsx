import { useState, useEffect, useCallback } from 'react';
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
import { FileText, Download, Loader2, Printer, MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { Contract } from '@/types/contract';

interface ContractsListViewProps {
  projectId: string;
  projectNumber?: string;
}

export function ContractsListView({ projectId, projectNumber }: ContractsListViewProps) {
  const [contracts, setContracts] = useState<(Contract & { payee_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<(Contract & { payee_name?: string }) | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchContracts = useCallback(async () => {
    if (!projectId) return;
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
  }, [projectId, toast]);

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    try {
      const c = contractToDelete as Contract & { docx_storage_path?: string | null; pdf_storage_path?: string | null };
      const pathsToRemove: string[] = [];
      if (c.docx_storage_path) pathsToRemove.push(c.docx_storage_path);
      if (c.pdf_storage_path) pathsToRemove.push(c.pdf_storage_path);
      if (pathsToRemove.length > 0) {
        await supabase.storage.from('project-documents').remove(pathsToRemove);
      }
      const { error } = await supabase.from('contracts').delete().eq('id', contractToDelete.id);
      if (error) throw error;
      toast({ title: 'Contract deleted', description: 'The contract has been removed. Related document records were cleaned up.' });
      fetchContracts();
    } catch (err) {
      console.error('Error deleting contract:', err);
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete contract',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

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
          <>
            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
              {contracts.map((c) => {
                const primaryLine = projectNumber
                  ? `Contract • ${projectNumber} • ${c.payee_name ?? '—'}`
                  : ((c as { internal_reference?: string }).internal_reference || c.contract_number || '—');
                return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate" title={primaryLine}>{primaryLine}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-medium">{formatCurrency(c.subcontract_price)}</p>
                          <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.agreement_date ? format(new Date(c.agreement_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                            {(c as { internal_reference?: string }).internal_reference || c.contract_number || '—'}
                          </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.open(c.pdf_url || c.docx_url || '', '_blank')}>
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {c.docx_url && (
                          <>
                            {!isMobile && (
                              <DropdownMenuItem onClick={() => {
                                const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(c.docx_url!)}`;
                                window.open(printUrl, '_blank');
                              }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.open(c.docx_url!, '_blank')}>
                              <Download className="h-4 w-4 mr-2" />
                              Download DOCX
                            </DropdownMenuItem>
                          </>
                        )}
                        {c.pdf_url && (
                          <DropdownMenuItem onClick={() => window.open(c.pdf_url!, '_blank')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setContractToDelete(c);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                </div>
              );
              })}
            </div>

            {/* Desktop Table */}
            <Table className="hidden md:table">
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
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                            {(c as { internal_reference?: string }).internal_reference || c.contract_number || '—'}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.open(c.pdf_url || c.docx_url || '', '_blank')}>
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {c.docx_url && (
                            <>
                              {!isMobile && (
                                <DropdownMenuItem onClick={() => {
                                  const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(c.docx_url!)}`;
                                  window.open(printUrl, '_blank');
                                }}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => window.open(c.docx_url!, '_blank')}>
                                <Download className="h-4 w-4 mr-2" />
                                Download DOCX
                              </DropdownMenuItem>
                            </>
                          )}
                          {c.pdf_url && (
                            <DropdownMenuItem onClick={() => window.open(c.pdf_url!, '_blank')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setContractToDelete(c);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contract? Related document records will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </CardContent>
    </Card>
  );
}
