import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeEntry {
  id: string;
  payee_id: string;
  project_id: string;
  expense_date: string;
  amount: number;
  description: string;
  approval_status: string;
  submitted_for_approval_at?: string;
  rejection_reason?: string;
  attachment_url?: string;
  payee_name?: string;
  project_name?: string;
  project_number?: string;
}

export const ApprovalQueue = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadEntries();
  }, [statusFilter]);

  const loadEntries = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('expenses')
        .select(`
          *,
          payees!expenses_payee_id_fkey(payee_name),
          projects!expenses_project_id_fkey(project_name, project_number)
        `)
        .eq('category', 'labor_internal')
        .order('submitted_for_approval_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedEntries = data.map(entry => ({
        ...entry,
        payee_name: entry.payees?.payee_name,
        project_name: entry.projects?.project_name,
        project_number: entry.projects?.project_number,
      }));

      setEntries(formattedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Time entry approved');
      loadEntries();
    } catch (error) {
      console.error('Error approving entry:', error);
      toast.error('Failed to approve entry');
    }
  };

  const handleReject = async (entryId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: null,
          approved_at: null,
        })
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Time entry rejected');
      setSelectedEntry(null);
      setRejectionReason('');
      loadEntries();
    } catch (error) {
      console.error('Error rejecting entry:', error);
      toast.error('Failed to reject entry');
    }
  };

  const handleBatchApprove = async () => {
    const pendingEntries = entries.filter(e => e.approval_status === 'pending');
    
    if (pendingEntries.length === 0) {
      toast.error('No pending entries to approve');
      return;
    }

    if (!confirm(`Approve ${pendingEntries.length} pending ${pendingEntries.length === 1 ? 'entry' : 'entries'}?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('approval_status', 'pending')
        .in('id', pendingEntries.map(e => e.id));

      if (error) throw error;

      toast.success(`Approved ${pendingEntries.length} ${pendingEntries.length === 1 ? 'entry' : 'entries'}`);
      loadEntries();
    } catch (error) {
      console.error('Error batch approving:', error);
      toast.error('Failed to batch approve');
    }
  };

  const getHours = (description: string) => {
    const match = description.match(/(\d+\.?\d*)\s*hours?/i);
    return match ? match[1] : '0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading approval queue...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Approval Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {statusFilter === 'pending' && entries.length > 0 && (
            <Button size="sm" onClick={handleBatchApprove}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve All
            </Button>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No {statusFilter !== 'all' ? statusFilter : ''} time entries
          </Card>
        ) : (
          entries.map(entry => (
            <Card key={entry.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.payee_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {entry.project_number}
                    </Badge>
                    {entry.attachment_url && (
                      <Badge variant="secondary" className="text-xs">
                        📎 Receipt
                      </Badge>
                    )}
                    <Badge
                      variant={
                        entry.approval_status === 'approved'
                          ? 'default'
                          : entry.approval_status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {entry.approval_status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(entry.expense_date), 'MMM d, yyyy')} •{' '}
                    {getHours(entry.description)} hours
                  </div>
                  <div className="text-xs text-muted-foreground">{entry.project_name}</div>
                  {entry.rejection_reason && (
                    <div className="text-xs text-destructive mt-1">
                      Rejected: {entry.rejection_reason}
                    </div>
                  )}
                  {entry.attachment_url && (
                    <div className="mt-2 border rounded overflow-hidden">
                      <img 
                        src={entry.attachment_url} 
                        alt="Receipt"
                        className="w-full h-auto max-h-32 object-contain bg-slate-50 cursor-pointer"
                        onClick={() => window.open(entry.attachment_url, '_blank')}
                      />
                    </div>
                  )}
                </div>

                {entry.approval_status === 'pending' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(entry.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEntry(entry.id)}
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rejection Form */}
              {selectedEntry === entry.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <Select
                    value={rejectionReason}
                    onValueChange={setRejectionReason}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rejection reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hours exceed expected">
                        Hours exceed expected
                      </SelectItem>
                      <SelectItem value="Wrong project charged">
                        Wrong project charged
                      </SelectItem>
                      <SelectItem value="Missing receipt">
                        Missing receipt
                      </SelectItem>
                      <SelectItem value="Duplicate entry">
                        Duplicate entry
                      </SelectItem>
                      <SelectItem value="custom">Custom reason...</SelectItem>
                    </SelectContent>
                  </Select>

                  {rejectionReason === 'custom' && (
                    <Textarea
                      placeholder="Enter custom rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                    />
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEntry(null);
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(entry.id)}
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
