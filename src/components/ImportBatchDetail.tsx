import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Trash2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImportBatchDetailProps {
  batchId: string;
  onBack: () => void;
}

interface BatchInfo {
  id: string;
  file_name: string;
  imported_at: string;
  total_rows: number;
  expenses_imported: number;
  revenues_imported: number;
  duplicates_skipped: number;
  errors: number;
  status: string;
  match_log?: Array<{
    qbName: string;
    matchedEntity: string | null;
    entityType: 'payee' | 'project' | 'client' | 'category' | 'account';
    confidence: number;
    decision: string;
    algorithm: string;
  }>;
}

interface BatchExpense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  projects?: { project_number: string } | null;
  payees?: { payee_name: string } | null;
}

interface BatchRevenue {
  id: string;
  description: string;
  amount: number;
  invoice_date: string;
  invoice_number: string;
  projects?: { project_number: string } | null;
  clients?: { client_name: string } | null;
}

export const ImportBatchDetail = ({ batchId, onBack }: ImportBatchDetailProps) => {
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [expenses, setExpenses] = useState<BatchExpense[]>([]);
  const [revenues, setRevenues] = useState<BatchRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [matchLogOpen, setMatchLogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const [batchRes, expensesRes, revenuesRes] = await Promise.all([
        supabase.from('import_batches').select('*').eq('id', batchId).single(),
        supabase.from('expenses').select(`
          id, description, amount, expense_date, category,
          projects!expenses_project_id_fkey (project_number),
          payees!expenses_payee_id_fkey (payee_name)
        `).eq('import_batch_id', batchId).order('expense_date', { ascending: false }),
        supabase.from('project_revenues').select(`
          id, description, amount, invoice_date, invoice_number,
          projects!project_revenues_project_id_fkey (project_number),
          clients!project_revenues_client_id_fkey (client_name)
        `).eq('import_batch_id', batchId).order('invoice_date', { ascending: false })
      ]);

      if (batchRes.data) setBatch(batchRes.data as unknown as BatchInfo);
      if (expensesRes.data) setExpenses(expensesRes.data as any[]);
      if (revenuesRes.data) setRevenues(revenuesRes.data as any[]);

      setIsLoading(false);
    };

    fetchData();
  }, [batchId]);

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      // Delete expenses and revenues with this batch ID
      const [expDel, revDel] = await Promise.all([
        supabase.from('expenses').delete().eq('import_batch_id', batchId),
        supabase.from('project_revenues').delete().eq('import_batch_id', batchId)
      ]);

      if (expDel.error) throw expDel.error;
      if (revDel.error) throw revDel.error;

      // Update batch status
      await supabase.from('import_batches').update({ status: 'rolled_back' }).eq('id', batchId);

      toast({ title: 'Import rolled back successfully' });
      setShowRollbackConfirm(false);
      onBack();
    } catch (error) {
      toast({
        title: 'Rollback failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Loading batch details...</CardContent>
      </Card>
    );
  }

  if (!batch) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Batch not found.</CardContent>
      </Card>
    );
  }

  const matchLog = batch.match_log || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="min-h-[48px]">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <CardTitle className="text-lg">{batch.file_name || 'Import Batch'}</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(batch.imported_at).toLocaleString()} — Status: {batch.status}
              </p>
            </div>
          </div>
          {batch.status === 'completed' && (
            <Button
              variant="destructive"
              size="sm"
              className="min-h-[48px]"
              onClick={() => setShowRollbackConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Rollback Import
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{batch.expenses_imported || 0}</div>
              <div className="text-xs text-blue-600">Expenses</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{batch.revenues_imported || 0}</div>
              <div className="text-xs text-green-600">Revenues</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{batch.duplicates_skipped || 0}</div>
              <div className="text-xs text-amber-600">Duplicates Skipped</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{batch.errors || 0}</div>
              <div className="text-xs text-red-600">Errors</div>
            </div>
          </div>

          {/* Expenses Table */}
          {expenses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Expenses ({expenses.length})</h4>
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs">Payee</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-xs py-2">{exp.expense_date}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[200px] truncate">{exp.description}</TableCell>
                        <TableCell className="text-xs py-2">{(exp.projects as any)?.project_number || '—'}</TableCell>
                        <TableCell className="text-xs py-2">{(exp.payees as any)?.payee_name || '—'}</TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatCurrency(exp.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Revenues Table */}
          {revenues.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Revenues ({revenues.length})</h4>
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs">Client</TableHead>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenues.map((rev) => (
                      <TableRow key={rev.id}>
                        <TableCell className="text-xs py-2">{rev.invoice_date}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[200px] truncate">{rev.description}</TableCell>
                        <TableCell className="text-xs py-2">{(rev.projects as any)?.project_number || '—'}</TableCell>
                        <TableCell className="text-xs py-2">{(rev.clients as any)?.client_name || '—'}</TableCell>
                        <TableCell className="text-xs py-2">{rev.invoice_number || '—'}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatCurrency(rev.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Match Log (collapsible) */}
          {matchLog.length > 0 && (() => {
            const autoMatched = matchLog.filter(e => e.decision === 'auto_matched').length;
            const fuzzyMatched = matchLog.filter(e => e.decision === 'fuzzy_matched' || e.decision === 'alias_matched').length;
            const unmatched = matchLog.filter(e => e.decision === 'unmatched' || e.decision === 'pending_review').length;
            const mapped = matchLog.filter(e => e.decision === 'mapped').length;

            const decisionColor = (decision: string) => {
              switch (decision) {
                case 'auto_matched': return 'bg-green-100 text-green-800 border-green-200';
                case 'fuzzy_matched': return 'bg-blue-100 text-blue-800 border-blue-200';
                case 'alias_matched': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
                case 'mapped': return 'bg-purple-100 text-purple-800 border-purple-200';
                case 'pending_review': return 'bg-amber-100 text-amber-800 border-amber-200';
                case 'unmatched': return 'bg-red-100 text-red-800 border-red-200';
                case 'created': return 'bg-teal-100 text-teal-800 border-teal-200';
                default: return '';
              }
            };

            const entityTypeColor = (entityType: string) => {
              switch (entityType) {
                case 'payee': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
                case 'project': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                case 'client': return 'bg-orange-50 text-orange-700 border-orange-200';
                case 'account': return 'bg-gray-100 text-gray-700 border-gray-300';
                case 'category': return 'bg-pink-50 text-pink-700 border-pink-200';
                default: return '';
              }
            };

            return (
              <Collapsible open={matchLogOpen} onOpenChange={setMatchLogOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 min-h-[48px]">
                  {matchLogOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Match Log ({matchLog.length} entries)
                  <span className="flex gap-1.5 ml-2">
                    {autoMatched > 0 && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">{autoMatched} auto</Badge>}
                    {fuzzyMatched > 0 && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{fuzzyMatched} fuzzy</Badge>}
                    {mapped > 0 && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{mapped} mapped</Badge>}
                    {unmatched > 0 && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">{unmatched} unmatched</Badge>}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs">QB Name</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Matched Entity</TableHead>
                          <TableHead className="text-xs">Confidence</TableHead>
                          <TableHead className="text-xs">Decision</TableHead>
                          <TableHead className="text-xs">Algorithm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchLog.map((entry, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs py-2 max-w-[160px] truncate">{entry.qbName}</TableCell>
                            <TableCell className="text-xs py-2">
                              <Badge variant="outline" className={`text-[10px] ${entityTypeColor(entry.entityType || '')}`}>
                                {entry.entityType || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-2 max-w-[160px] truncate">{entry.matchedEntity || '—'}</TableCell>
                            <TableCell className="text-xs py-2">
                              {entry.confidence ? (
                                <span className={entry.confidence >= 75 ? 'text-green-700 font-medium' : entry.confidence >= 40 ? 'text-amber-700' : 'text-red-600'}>
                                  {Math.round(entry.confidence)}%
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-xs py-2">
                              <Badge variant="outline" className={`text-[10px] ${decisionColor(entry.decision)}`}>{entry.decision}</Badge>
                            </TableCell>
                            <TableCell className="text-xs py-2 text-gray-500">{entry.algorithm}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })()}
        </CardContent>
      </Card>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackConfirm} onOpenChange={setShowRollbackConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Rollback
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {expenses.length} expense{expenses.length !== 1 ? 's' : ''} and{' '}
              {revenues.length} revenue{revenues.length !== 1 ? 's' : ''} from this import batch.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRollbackConfirm(false)} className="min-h-[48px]">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={isRollingBack}
              className="min-h-[48px]"
            >
              {isRollingBack ? 'Rolling back...' : 'Yes, Rollback Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
