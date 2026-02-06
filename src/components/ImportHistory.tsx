import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ImportBatchDetail } from './ImportBatchDetail';

interface ImportBatch {
  id: string;
  file_name: string;
  imported_by: string;
  imported_at: string;
  total_rows: number;
  expenses_imported: number;
  revenues_imported: number;
  duplicates_skipped: number;
  errors: number;
  status: string;
}

export const ImportHistory = () => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const fetchBatches = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .order('imported_at', { ascending: false });

    if (!error && data) {
      setBatches(data as ImportBatch[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'rolled_back':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rolled Back</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (selectedBatchId) {
    return (
      <ImportBatchDetail
        batchId={selectedBatchId}
        onBack={() => {
          setSelectedBatchId(null);
          fetchBatches(); // Refresh in case of rollback
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-lg">Import History</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBatches} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading import history...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No import history yet</p>
            <p className="text-sm mt-1">Import a CSV file to see your history here.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-medium">Date</TableHead>
                  <TableHead className="text-xs font-medium">File Name</TableHead>
                  <TableHead className="text-xs font-medium text-right">Expenses</TableHead>
                  <TableHead className="text-xs font-medium text-right">Revenues</TableHead>
                  <TableHead className="text-xs font-medium text-right">Duplicates</TableHead>
                  <TableHead className="text-xs font-medium text-right">Errors</TableHead>
                  <TableHead className="text-xs font-medium">Status</TableHead>
                  <TableHead className="text-xs font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm py-3">
                      {new Date(batch.imported_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-sm py-3 font-medium max-w-[200px] truncate">
                      {batch.file_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm py-3 text-right">
                      {batch.expenses_imported || 0}
                    </TableCell>
                    <TableCell className="text-sm py-3 text-right">
                      {batch.revenues_imported || 0}
                    </TableCell>
                    <TableCell className="text-sm py-3 text-right">
                      {batch.duplicates_skipped || 0}
                    </TableCell>
                    <TableCell className="text-sm py-3 text-right">
                      {batch.errors || 0}
                    </TableCell>
                    <TableCell className="py-3">
                      {getStatusBadge(batch.status)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[48px] min-w-[48px]"
                        onClick={() => setSelectedBatchId(batch.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
