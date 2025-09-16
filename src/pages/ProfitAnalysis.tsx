import { useEffect, useState } from 'react';
import { Estimate } from '@/types/estimate';
import { Quote } from '@/types/quote';
import { Expense } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';
import ProfitAnalysis from '@/components/ProfitAnalysis';

export default function ProfitAnalysisPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data from Supabase
      const [estimatesResult, quotesResult, expensesResult] = await Promise.all([
        supabase.from('estimates').select(`
          *,
          projects(project_name, client_name)
        `),
        supabase.from('quotes').select(`
          *,
          vendors(vendor_name),
          projects(project_name, client_name),
          quote_line_items(*)
        `),
        supabase.from('expenses').select(`
          *,
          vendors(vendor_name),
          projects(project_name)
        `)
      ]);

      if (estimatesResult.error) throw estimatesResult.error;
      if (quotesResult.error) throw quotesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      // Transform estimates
      const transformedEstimates: Estimate[] = (estimatesResult.data || []).map(estimate => ({
        id: estimate.id,
        project_id: estimate.project_id,
        project_name: estimate.projects?.project_name || '',
        client_name: estimate.projects?.client_name || '',
        estimate_number: estimate.estimate_number,
        revision_number: estimate.revision_number,
        date: new Date(estimate.date_created),
        date_created: new Date(estimate.date_created),
        total_amount: estimate.total_amount,
        status: estimate.status,
        notes: estimate.notes,
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        createdAt: new Date(estimate.created_at),
        lineItems: []
      }));

      // Transform quotes
      const transformedQuotes: Quote[] = (quotesResult.data || []).map(quote => ({
        id: quote.id,
        project_id: quote.project_id,
        estimate_id: quote.estimate_id,
        projectName: quote.projects?.project_name || '',
        client: quote.projects?.client_name || '',
        vendor_id: quote.vendor_id,
        quotedBy: quote.vendors?.vendor_name || '',
        dateReceived: new Date(quote.date_received),
        quoteNumber: quote.quote_number,
        lineItems: quote.quote_line_items?.map((item: any) => ({
          id: item.id,
          estimateLineItemId: item.estimate_line_item_id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total
        })) || [],
        subtotals: {
          labor: 0,
          subcontractors: 0,
          materials: 0,
          equipment: 0,
          other: 0
        },
        total: quote.total_amount,
        notes: quote.notes,
        attachment_url: quote.attachment_url,
        createdAt: new Date(quote.created_at)
      }));

      // Transform expenses
      const transformedExpenses: Expense[] = (expensesResult.data || []).map(expense => ({
        id: expense.id,
        project_id: expense.project_id,
        vendor_id: expense.vendor_id,
        category: expense.category,
        transaction_type: expense.transaction_type,
        description: expense.description,
        amount: expense.amount,
        expense_date: new Date(expense.expense_date),
        date: new Date(expense.expense_date),
        invoice_number: expense.invoice_number,
        attachment_url: expense.attachment_url,
        is_planned: expense.is_planned,
        account_name: expense.account_name,
        account_full_name: expense.account_full_name,
        quickbooks_transaction_id: expense.quickbooks_transaction_id,
        createdAt: new Date(expense.created_at),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        vendor_name: expense.vendors?.vendor_name,
        project_name: expense.projects?.project_name
      }));

      setEstimates(transformedEstimates);
      setQuotes(transformedQuotes);
      setExpenses(transformedExpenses);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profit analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <ProfitAnalysis 
        estimates={estimates}
        quotes={quotes}
        expenses={expenses}
      />
    </div>
  );
}