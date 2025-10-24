import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import { Receipt, Search, Trash2, Plus, Edit, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { AddReceiptModal } from './AddReceiptModal';
import { EditReceiptModal } from './EditReceiptModal';
import { ReassignReceiptDialog } from './ReassignReceiptDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';

interface ReceiptData {
  id: string;
  image_url: string;
  amount: number;
  payee_id: string | null;
  payee_name?: string;
  project_id: string | null;
  project_number?: string;
  project_name?: string;
  description: string | null;
  captured_at: string;
}

type FilterType = 'all' | 'unassigned' | 'thisWeek' | 'thisMonth';
type SortType = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export const ReceiptsList = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptData | null>(null);
  const [reassigningReceiptIds, setReassigningReceiptIds] = useState<string[]>([]);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          payees:payee_id (payee_name),
          projects:project_id (project_number, project_name)
        `)
        .order('captured_at', { ascending: false });

      if (error) throw error;

      const formattedReceipts = (data || []).map((receipt: any) => ({
        id: receipt.id,
        image_url: receipt.image_url,
        amount: receipt.amount,
        payee_id: receipt.payee_id,
        payee_name: receipt.payees?.payee_name,
        project_id: receipt.project_id,
        project_number: receipt.projects?.project_number,
        project_name: receipt.projects?.project_name,
        description: receipt.description,
        captured_at: receipt.captured_at,
      }));

      setReceipts(formattedReceipts);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedReceipts = useMemo(() => {
    let result = [...receipts];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.payee_name?.toLowerCase().includes(term) ||
          r.project_name?.toLowerCase().includes(term) ||
          r.project_number?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          r.amount.toString().includes(term)
      );
    }

    // Apply quick filter
    const now = new Date();
    if (filter === 'unassigned') {
      result = result.filter((r) => r.project_number === 'SYS-000');
    } else if (filter === 'thisWeek') {
      const weekStart = startOfWeek(now);
      result = result.filter((r) => 
        isWithinInterval(new Date(r.captured_at), { start: weekStart, end: now })
      );
    } else if (filter === 'thisMonth') {
      const monthStart = startOfMonth(now);
      result = result.filter((r) => 
        isWithinInterval(new Date(r.captured_at), { start: monthStart, end: now })
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
        case 'date-asc':
          return new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return result;
  }, [receipts, searchTerm, filter, sortBy]);

  const unassignedCount = useMemo(
    () => receipts.filter((r) => r.project_number === 'SYS-000').length,
    [receipts]
  );

  const handleDelete = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('Receipt deleted');
      loadReceipts();
      setExpandedId(null);
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected receipts?`)) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} receipts deleted`);
      setSelectedIds([]);
      setBulkMode(false);
      loadReceipts();
    } catch (error) {
      console.error('Failed to delete receipts:', error);
      toast.error('Failed to delete receipts');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredAndSortedReceipts.map((r) => r.id) : []);
  };

  const handleExpand = (id: string) => {
    if (bulkMode) {
      toggleSelection(id);
    } else {
      setExpandedId(expandedId === id ? null : id);
    }
  };

  if (loading) {
    return (
      <MobilePageWrapper>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper className="space-y-3">
      {/* Search & Sort Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <NativeSelect
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortType)}
          className="w-32 h-9 text-sm"
        >
          <option value="date-desc">Newest</option>
          <option value="date-asc">Oldest</option>
          <option value="amount-desc">Highest $</option>
          <option value="amount-asc">Lowest $</option>
        </NativeSelect>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="h-8 px-3 text-xs whitespace-nowrap"
        >
          All ({receipts.length})
        </Button>
        <Button
          variant={filter === 'unassigned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unassigned')}
          className="h-8 px-3 text-xs whitespace-nowrap"
        >
          Unassigned ({unassignedCount})
        </Button>
        <Button
          variant={filter === 'thisWeek' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('thisWeek')}
          className="h-8 px-3 text-xs whitespace-nowrap"
        >
          This Week
        </Button>
        <Button
          variant={filter === 'thisMonth' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('thisMonth')}
          className="h-8 px-3 text-xs whitespace-nowrap"
        >
          This Month
        </Button>
      </div>

      {/* Bulk Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {filteredAndSortedReceipts.length} receipt{filteredAndSortedReceipts.length !== 1 ? 's' : ''}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setBulkMode(!bulkMode);
            setSelectedIds([]);
          }}
          className="h-7 text-xs"
        >
          {bulkMode ? 'Cancel' : 'Select'}
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && selectedIds.length > 0 && (
        <div className="sticky top-0 bg-background border rounded-lg p-2 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.length === filteredAndSortedReceipts.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
          </div>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs px-2"
              onClick={() => setReassigningReceiptIds(selectedIds)}
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Assign
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-7 text-xs px-2">
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Receipts List */}
      {filteredAndSortedReceipts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No receipts found</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden">
          {filteredAndSortedReceipts.map((receipt) => (
            <div key={receipt.id}>
              {/* Compact Row */}
              <div
                className="flex items-center gap-3 p-2 hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors"
                onClick={() => handleExpand(receipt.id)}
              >
                {bulkMode && (
                  <Checkbox
                    checked={selectedIds.includes(receipt.id)}
                    onCheckedChange={() => toggleSelection(receipt.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                
                {/* Thumbnail */}
                <img
                  src={receipt.image_url}
                  alt="Receipt"
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-sm">${receipt.amount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(receipt.captured_at), 'MMM d')}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {receipt.payee_name || 'No payee'} • {receipt.project_number || 'No project'}
                  </div>
                </div>

                {/* Status Badge */}
                <Badge
                  variant={receipt.project_number === 'SYS-000' ? 'secondary' : 'outline'}
                  className="h-5 px-2 text-xs whitespace-nowrap flex-shrink-0"
                >
                  {receipt.project_number === 'SYS-000' ? 'Unassigned' : 'Filed'}
                </Badge>

                {/* Expand Icon */}
                {!bulkMode && (
                  <div className="flex-shrink-0">
                    {expandedId === receipt.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Detail View */}
              {expandedId === receipt.id && !bulkMode && (
                <div className="bg-muted/30 p-3 space-y-3 border-t">
                  {/* Receipt Image */}
                  <img
                    src={receipt.image_url}
                    alt="Receipt"
                    className="w-full rounded-lg"
                  />

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="font-semibold">${receipt.amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div>{format(new Date(receipt.captured_at), 'MMM d, yyyy')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Payee</div>
                      <div className="truncate">{receipt.payee_name || 'Not set'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Project</div>
                      <div className="truncate">{receipt.project_number || 'Not set'}</div>
                    </div>
                  </div>

                  {receipt.description && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Notes</div>
                      <div className="text-sm">{receipt.description}</div>
                    </div>
                  )}

                  {/* Inline Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingReceipt(receipt);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReassigningReceiptIds([receipt.id]);
                      }}
                    >
                      <FolderOpen className="w-3 h-3 mr-1" />
                      Reassign
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(receipt.id);
                      }}
                      className="h-8 px-3"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <div className="fixed bottom-20 right-4 z-20">
        <Button
          onClick={() => setShowAddModal(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Add Receipt Modal */}
      <AddReceiptModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadReceipts();
          setShowAddModal(false);
        }}
      />

      {/* Edit Receipt Modal */}
      <EditReceiptModal
        open={!!editingReceipt}
        onClose={() => setEditingReceipt(null)}
        onSuccess={() => {
          setEditingReceipt(null);
          loadReceipts();
        }}
        receipt={editingReceipt!}
      />

      {/* Reassign Receipt Dialog */}
      <ReassignReceiptDialog
        open={reassigningReceiptIds.length > 0}
        onClose={() => setReassigningReceiptIds([])}
        onSuccess={() => {
          setReassigningReceiptIds([]);
          setSelectedIds([]);
          setBulkMode(false);
          loadReceipts();
        }}
        receiptIds={reassigningReceiptIds}
        currentProjectNumber={
          reassigningReceiptIds.length === 1
            ? receipts.find((r) => r.id === reassigningReceiptIds[0])?.project_number
            : undefined
        }
      />
    </MobilePageWrapper>
  );
};
