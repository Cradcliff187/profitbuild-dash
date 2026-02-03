import { useState, useEffect, useCallback } from 'react';
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
import { FileText, Download, Loader2, Printer, MoreHorizontal, Trash2, Eye } from 'lucide-react';
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
import { MobileListCard } from '@/components/ui/mobile-list-card';
import { DocumentLeadingIcon } from '@/utils/documentFileType';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { DocumentPreviewModals } from '@/components/documents/DocumentPreviewModals';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { Contract } from '@/types/contract';

// Contract status color helper
function getContractStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'draft': return 'bg-slate-100 text-slate-700';
    case 'generated': return 'bg-amber-100 text-amber-700';
    case 'sent': return 'bg-blue-100 text-blue-700';
    case 'signed': return 'bg-emerald-100 text-emerald-700';
    case 'executed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

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
  const preview = useDocumentPreview();

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No contracts found</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Generate a Subcontractor Project Agreement from an accepted quote.
          </p>
        </div>
      ) : (
          <>
            {/* Mobile Cards */}
            <div className="space-y-2 md:hidden">
              {contracts.map((c) => (
                <MobileListCard
                  key={c.id}
                  leading={<DocumentLeadingIcon documentType="contract" />}
                  title={projectNumber
                    ? `Contract • ${projectNumber}`
                    : ((c as { internal_reference?: string }).internal_reference || c.contract_number || '—')
                  }
                  subtitle={c.payee_name ?? '—'}
                  badge={{
                    label: c.status,
                    className: getContractStatusColor(c.status),
                  }}
                  secondaryBadge={{
                    label: 'Subcontractor Agreement',
                    className: '',
                  }}
                  metrics={[
                    { label: 'Amount', value: formatCurrency(c.subcontract_price) },
                    {
                      label: 'Agreement',
                      value: c.agreement_date
                        ? format(new Date(c.agreement_date), 'MMM d, yyyy')
                        : '—',
                    },
                  ]}
                  onTap={() => {
                    const url = c.pdf_url || c.docx_url;
                    if (url) {
                      preview.openPreview({
                        fileUrl: url,
                        fileName: (c as { internal_reference?: string }).internal_reference || c.contract_number || 'Contract',
                        mimeType: c.pdf_url ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      });
                    }
                  }}
                  actions={[
                    {
                      icon: Eye,
                      label: 'View',
                      onClick: (e) => {
                        e.stopPropagation();
                        const url = c.pdf_url || c.docx_url;
                        if (url) preview.openPreview({
                          fileUrl: url,
                          fileName: (c as { internal_reference?: string }).internal_reference || c.contract_number || 'Contract',
                          mimeType: c.pdf_url ? 'application/pdf' : null,
                        });
                      },
                    },
                    ...(c.docx_url ? [{
                      icon: Download,
                      label: 'Download DOCX',
                      onClick: (e: React.MouseEvent) => { e.stopPropagation(); window.open(c.docx_url!, '_blank'); },
                    }] : []),
                    ...(c.pdf_url ? [{
                      icon: FileText,
                      label: 'Download PDF',
                      onClick: (e: React.MouseEvent) => { e.stopPropagation(); window.open(c.pdf_url!, '_blank'); },
                    }] : []),
                    {
                      icon: Trash2,
                      label: 'Delete',
                      variant: 'destructive' as const,
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setContractToDelete(c);
                        setDeleteDialogOpen(true);
                      },
                    },
                  ]}
                />
              ))}
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
                  <TableCell>
                    <button
                      className="font-medium hover:underline text-left"
                      onClick={() => {
                        const url = c.pdf_url || c.docx_url;
                        if (url) preview.openPreview({
                          fileUrl: url,
                          fileName: (c as { internal_reference?: string }).internal_reference || c.contract_number || 'Contract',
                          mimeType: c.pdf_url ? 'application/pdf' : null,
                        });
                      }}
                    >
                      {(c as { internal_reference?: string }).internal_reference || c.contract_number || '—'}
                    </button>
                  </TableCell>
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
                          <DropdownMenuItem onClick={() => {
                            const url = c.pdf_url || c.docx_url;
                            if (url) preview.openPreview({
                              fileUrl: url,
                              fileName: (c as { internal_reference?: string }).internal_reference || c.contract_number || 'Contract',
                              mimeType: c.pdf_url ? 'application/pdf' : null,
                            });
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
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

      <DocumentPreviewModals preview={preview} />
    </div>
  );
}
