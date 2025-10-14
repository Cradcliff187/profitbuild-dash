import { Download, Trash2, Send, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export const BulkActionsBar = ({ selectedIds, onClearSelection, onRefresh }: BulkActionsBarProps) => {
  if (selectedIds.length === 0) return null;

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} time ${selectedIds.length === 1 ? 'entry' : 'entries'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Deleted ${selectedIds.length} ${selectedIds.length === 1 ? 'entry' : 'entries'}`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Failed to delete entries');
    }
  };

  const handleBulkSubmit = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'pending',
          submitted_for_approval_at: new Date().toISOString(),
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Submitted ${selectedIds.length} ${selectedIds.length === 1 ? 'entry' : 'entries'} for approval`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error('Error submitting entries:', error);
      toast.error('Failed to submit entries');
    }
  };

  const handleBulkExport = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          payees!expenses_payee_id_fkey(payee_name),
          projects!expenses_project_id_fkey(project_name, project_number)
        `)
        .in('id', selectedIds);

      if (error) throw error;

      // Create CSV content
      const headers = ['Date', 'Worker', 'Project', 'Hours', 'Rate', 'Amount', 'Note', 'Status'];
      const rows = data.map(entry => {
        const hours = entry.description.match(/(\d+\.?\d*)\s*hours?/i)?.[1] || '0';
        const note = entry.description.match(/(?:hours?)\s*-\s*(.+)$/i)?.[1] || '';
        return [
          entry.expense_date,
          entry.payees?.payee_name || '',
          `${entry.projects?.project_number || ''} - ${entry.projects?.project_name || ''}`,
          hours,
          (entry.amount / parseFloat(hours)).toFixed(2),
          entry.amount.toFixed(2),
          note,
          entry.approval_status || 'draft',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-entries-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Exported to CSV');
    } catch (error) {
      console.error('Error exporting entries:', error);
      toast.error('Failed to export entries');
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg p-3 flex items-center gap-2">
        <Badge variant="secondary" className="mr-2">
          {selectedIds.length} selected
        </Badge>
        
        <Button size="sm" variant="outline" onClick={handleBulkExport}>
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
        
        <Button size="sm" variant="outline" onClick={handleBulkSubmit}>
          <Send className="w-4 h-4 mr-1" />
          Submit
        </Button>
        
        <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
        
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
    </div>
  );
};
