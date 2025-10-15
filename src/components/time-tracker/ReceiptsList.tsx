import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Receipt, Loader2, Search, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

export const ReceiptsList = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, []);

  useEffect(() => {
    filterReceipts();
  }, [searchTerm, receipts]);

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

  const filterReceipts = () => {
    if (!searchTerm.trim()) {
      setFilteredReceipts(receipts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = receipts.filter(
      (r) =>
        r.payee_name?.toLowerCase().includes(term) ||
        r.project_name?.toLowerCase().includes(term) ||
        r.project_number?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.amount.toString().includes(term)
    );
    setFilteredReceipts(filtered);
  };

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
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const handleView = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts by payee, project, or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Receipts Count */}
      <div className="text-sm text-muted-foreground">
        {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} found
      </div>

      {/* Receipts Grid */}
      {filteredReceipts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No receipts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Receipt Image */}
              <div className="relative aspect-[4/3] bg-muted">
                <img
                  src={receipt.image_url}
                  alt="Receipt"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleView(receipt)}
                />
              </div>

              {/* Receipt Details */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg">
                      ${receipt.amount.toFixed(2)}
                    </div>
                    {receipt.payee_name && (
                      <div className="text-sm text-muted-foreground truncate">
                        {receipt.payee_name}
                      </div>
                    )}
                    {receipt.project_number && (
                      <div className="text-xs text-muted-foreground truncate">
                        {receipt.project_number}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(receipt.captured_at), 'MMM d, yyyy')}
                    </div>
                    {receipt.description && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {receipt.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(receipt)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(receipt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Receipt Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <img
                src={selectedReceipt.image_url}
                alt="Receipt"
                className="w-full rounded-lg"
              />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">${selectedReceipt.amount.toFixed(2)}</span>
                </div>
                {selectedReceipt.payee_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payee:</span>
                    <span>{selectedReceipt.payee_name}</span>
                  </div>
                )}
                {selectedReceipt.project_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project:</span>
                    <span>
                      {selectedReceipt.project_number} - {selectedReceipt.project_name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Captured:</span>
                  <span>{format(new Date(selectedReceipt.captured_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {selectedReceipt.description && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1">{selectedReceipt.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
