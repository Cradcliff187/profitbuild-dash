import { useEffect, useState } from 'react';
import { Estimate } from '@/types/estimate';
import { Quote, QuoteStatus } from '@/types/quote';
import { Expense, ExpenseCategory } from '@/types/expense';
import { Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import ProfitAnalysis from '@/components/ProfitAnalysis';

export default function ProfitAnalysisPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data from Supabase
      const [estimatesResult, quotesResult, expensesResult, projectsResult] = await Promise.all([
        supabase.from('estimates').select(`
          *,
          projects(project_name, client_name)
        `),
        supabase.from('quotes').select(`
          *,
          payees(payee_name),
          projects(project_name, client_name),
          quote_line_items(*)
        `),
        supabase.from('expenses').select(`
          *,
          payees(payee_name),
          projects(project_name)
        `),
        supabase.from('projects').select('*')
      ]);

      if (estimatesResult.error) throw estimatesResult.error;
      if (quotesResult.error) throw quotesResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (projectsResult.error) throw projectsResult.error;

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
        contingency_percent: estimate.contingency_percent || 10.0,
        contingency_amount: estimate.contingency_amount,
        contingency_used: estimate.contingency_used || 0,
        version_number: estimate.version_number || 1,
        parent_estimate_id: estimate.parent_estimate_id || undefined,
        is_current_version: estimate.is_current_version ?? true,
        valid_for_days: estimate.valid_for_days || 30,
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        createdAt: new Date(estimate.created_at),
        lineItems: [],
        defaultMarkupPercent: 15,
        targetMarginPercent: 20
      }));

      // Transform quotes
      const transformedQuotes: Quote[] = (quotesResult.data || []).map(quote => ({
        id: quote.id,
        project_id: quote.project_id,
        estimate_id: quote.estimate_id,
        projectName: quote.projects?.project_name || '',
        client: quote.projects?.client_name || '',
        payee_id: quote.payee_id,
        quotedBy: quote.payees?.payee_name || '',
        dateReceived: new Date(quote.date_received),
        quoteNumber: quote.quote_number,
        status: (quote.status || 'pending') as QuoteStatus,
        accepted_date: quote.accepted_date ? new Date(quote.accepted_date) : undefined,
        valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
        rejection_reason: quote.rejection_reason,
        estimate_line_item_id: quote.estimate_line_item_id,
        includes_materials: quote.includes_materials ?? true,
        includes_labor: quote.includes_labor ?? true,
        lineItems: quote.quote_line_items?.map((item: any) => ({
          id: item.id,
          estimateLineItemId: item.estimate_line_item_id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          pricePerUnit: item.rate,
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
        payee_id: expense.payee_id,
        category: expense.category as ExpenseCategory, // Cast database value to enum
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
        payee_name: expense.payees?.payee_name,
        project_name: expense.projects?.project_name
      }));

      // Transform projects
      const transformedProjects: Project[] = (projectsResult.data || []).map(project => ({
        id: project.id,
        project_name: project.project_name,
        project_number: project.project_number,
        qb_formatted_number: project.qb_formatted_number,
        client_name: project.client_name,
        address: project.address,
        project_type: project.project_type,
        job_type: project.job_type,
        status: project.status,
        start_date: project.start_date ? new Date(project.start_date) : undefined,
        end_date: project.end_date ? new Date(project.end_date) : undefined,
        quickbooks_job_id: project.quickbooks_job_id,
        sync_status: project.sync_status,
        last_synced_at: project.last_synced_at,
        contracted_amount: project.contracted_amount,
        total_accepted_quotes: project.total_accepted_quotes,
        current_margin: project.current_margin,
        margin_percentage: project.margin_percentage,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      }));

      setEstimates(transformedEstimates);
      setQuotes(transformedQuotes);
      setExpenses(transformedExpenses);
      setProjects(transformedProjects);
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
        projects={projects}
      />
    </div>
  );
}