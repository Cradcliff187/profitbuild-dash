import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateProjectMargin, ProjectMargin } from '@/types/margin';
import { toast } from 'sonner';

interface UseMarginCalculationReturn {
  marginData: ProjectMargin | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useMarginCalculation = (projectId: string): UseMarginCalculationReturn => {
  const [marginData, setMarginData] = useState<ProjectMargin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarginData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parallel data fetching for optimal performance
      const [projectResult, estimatesResult, quotesResult, expensesResult] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('estimates').select('*').eq('project_id', projectId),
        supabase.from('quotes').select('*').eq('project_id', projectId),
        supabase.from('expenses').select('*').eq('project_id', projectId)
      ]);

      if (projectResult.error) {
        throw new Error(`Failed to fetch project: ${projectResult.error.message}`);
      }

      if (estimatesResult.error) {
        throw new Error(`Failed to fetch estimates: ${estimatesResult.error.message}`);
      }

      if (quotesResult.error) {
        throw new Error(`Failed to fetch quotes: ${quotesResult.error.message}`);
      }

      if (expensesResult.error) {
        throw new Error(`Failed to fetch expenses: ${expensesResult.error.message}`);
      }

      const projectData = projectResult.data;
      const estimatesData = estimatesResult.data || [];
      const expensesData = expensesResult.data || [];

      // Transform project data from database format to Project interface format
      const project = {
        ...projectData,
        start_date: projectData.start_date ? new Date(projectData.start_date) : undefined,
        end_date: projectData.end_date ? new Date(projectData.end_date) : undefined,
        created_at: new Date(projectData.created_at),
        updated_at: new Date(projectData.updated_at)
      };

      // Transform expenses data from database format to Expense interface format
      const expenses = expensesData.map(expense => ({
        ...expense,
        expense_date: new Date(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        category: expense.category as any, // Cast category to match ExpenseCategory enum
        transaction_type: expense.transaction_type as any // Cast transaction_type to match enum
      }));

      // Calculate margin using existing utility
      const margin = calculateProjectMargin(project, expenses, estimatesData as any);
      
      setMarginData(margin);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch margin data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMarginData();
  }, [fetchMarginData]);

  return {
    marginData,
    loading,
    error,
    refetch: fetchMarginData
  };
};