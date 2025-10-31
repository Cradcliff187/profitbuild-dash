import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Calendar, Clock, X, Plus } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { AddReceiptModal } from './AddReceiptModal';

interface ReceiptEntry {
  id: string;
  attachment_url: string;
  expense_date: string;
  description: string;
  hours: number;
  project: {
    project_number: string;
    project_name: string;
    client_name: string;
  };
  payee: {
    payee_name: string;
  };
}

export const ReceiptsGallery: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptEntry | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [showAddReceiptModal, setShowAddReceiptModal] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, [dateFilter]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      
      let dateCondition = '';
      const now = new Date();
      
      if (dateFilter === 'today') {
        dateCondition = format(now, 'yyyy-MM-dd');
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = format(weekAgo, 'yyyy-MM-dd');
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateCondition = format(monthAgo, 'yyyy-MM-dd');
      }

      let query = supabase
        .from('expenses')
        .select(`
          id,
          attachment_url,
          expense_date,
          description,
          amount,
          category,
          payees(id, payee_name, hourly_rate),
          projects!inner(id, project_number, project_name, client_name)
        `)
        .not('attachment_url', 'is', null)
        .order('expense_date', { ascending: false });

      if (dateFilter !== 'all') {
        query = query.gte('expense_date', dateCondition);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedReceipts = data?.map((expense: any) => ({
        id: expense.id,
        attachment_url: expense.attachment_url,
        expense_date: expense.expense_date,
        description: expense.description,
        hours: expense.amount / (expense.payees?.hourly_rate || 75),
        project: expense.projects,
        payee: expense.payees,
      })) || [];

      setReceipts(formattedReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <BrandedLoader message="Loading receipts..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 pb-20">
      {/* Date Filter Pills */}
      <div className="bg-card shadow-sm border-b p-3 sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto">
          {(['today', 'week', 'month', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                dateFilter === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {filter === 'today' && 'Today'}
              {filter === 'week' && 'This Week'}
              {filter === 'month' && 'This Month'}
              {filter === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Receipt Count */}
        <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-primary">{receipts.length}</div>
              <div className="text-sm text-muted-foreground">
                Receipt{receipts.length !== 1 ? 's' : ''} found
              </div>
            </div>
            <Camera className="w-12 h-12 text-muted-foreground opacity-20" />
          </div>
        </div>

        {receipts.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm p-8 text-center">
            <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold mb-2">No receipts found</p>
            <p className="text-sm text-muted-foreground">
              Receipts will appear here after clocking out with a photo
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-card rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedReceipt(receipt)}
              >
                {/* Receipt Image Thumbnail */}
                <div className="aspect-square bg-slate-100 relative">
                  <img
                    src={receipt.attachment_url}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                  />
                  {receipt.project.project_number === 'SYS-000' && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Unassigned
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    {receipt.hours.toFixed(1)}h
                  </div>
                </div>

                {/* Receipt Info */}
                <div className="p-2">
                  <div className="text-xs font-medium text-foreground truncate">
                    {receipt.project.project_number}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {receipt.payee.payee_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(receipt.expense_date), 'MMM d')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-20">
        <Button
          onClick={() => setShowAddReceiptModal(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Add Receipt Modal */}
      <AddReceiptModal
        open={showAddReceiptModal}
        onClose={() => setShowAddReceiptModal(false)}
        onSuccess={() => {
          loadReceipts();
          setShowAddReceiptModal(false);
        }}
      />

      {/* Full-Screen Receipt Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          onClick={() => setSelectedReceipt(null)}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 text-white">
            <div className="flex-1">
              <div className="font-semibold">{selectedReceipt.project.project_number}</div>
              <div className="text-sm opacity-80">{selectedReceipt.payee.payee_name}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReceipt(null);
              }}
              className="p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Full-Size Image */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedReceipt.attachment_url}
              alt="Receipt"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Footer Info */}
          <div className="p-4 text-white space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              {format(new Date(selectedReceipt.expense_date), 'MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              {selectedReceipt.hours.toFixed(2)} hours
            </div>
            {selectedReceipt.description && (
              <div className="text-sm opacity-80 mt-2">{selectedReceipt.description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
