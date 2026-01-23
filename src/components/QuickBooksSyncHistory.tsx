import React, { useState, useEffect } from 'react';
import { History, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface QuickBooksSyncHistoryProps {
  open: boolean;
  onClose: () => void;
}

interface SyncRecord {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  sync_status: 'in_progress' | 'completed' | 'failed';
  start_date: string;
  end_date: string;
  transactions_fetched: number;
  expenses_imported: number;
  revenues_imported: number;
  duplicates_skipped: number;
  error_message: string | null;
  environment: string;
  created_at: string;
}

export const QuickBooksSyncHistory: React.FC<QuickBooksSyncHistoryProps> = ({
  open,
  onClose
}) => {
  const [syncs, setSyncs] = useState<SyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSyncHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('quickbooks_transaction_syncs')
        .select('*')
        .order('sync_started_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setSyncs(data || []);
    } catch (err) {
      console.error('Error fetching sync history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sync history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSyncHistory();
    }
  }, [open]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return 'N/A';
    const durationMs = new Date(completed).getTime() - new Date(started).getTime();
    const seconds = Math.round(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            QuickBooks Sync History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading sync history...</p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && syncs.length === 0 && (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No sync history found</p>
              <p className="text-sm text-gray-500 mt-1">
                Run your first QuickBooks sync to see history here
              </p>
            </div>
          )}

          {!isLoading && !error && syncs.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Fetched</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Revenues</TableHead>
                    <TableHead className="text-right">Duplicates</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Environment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncs.map((sync) => (
                    <TableRow key={sync.id}>
                      <TableCell className="text-sm">
                        <div>{new Date(sync.sync_started_at).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(sync.sync_started_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sync.sync_status)}
                        {sync.error_message && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={sync.error_message}>
                            {sync.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{new Date(sync.start_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          to {new Date(sync.end_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {sync.transactions_fetched}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-blue-600">
                        {sync.expenses_imported}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">
                        {sync.revenues_imported}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-gray-500">
                        {sync.duplicates_skipped}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(sync.sync_started_at, sync.sync_completed_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sync.environment === 'production' ? 'default' : 'secondary'}>
                          {sync.environment}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" size="sm" onClick={fetchSyncHistory} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
