import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between' | 'is_null' | 'contains_any' | 'contains_only' | 'contains_all';
  value: any;
}

export interface ReportConfig {
  data_source: 'projects' | 'expenses' | 'quotes' | 'time_entries' | 'estimate_line_items' | 'internal_costs';
  filters?: Record<string, ReportFilter>;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
  limit?: number;
}

export interface ReportResult {
  data: any[];
  metadata: {
    row_count: number;
    execution_time_ms: number;
    data_source: string;
  };
}

export function useReportExecution() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeReport = async (config: ReportConfig): Promise<ReportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert filters to JSONB format expected by RPC function
      const filtersJsonb: Record<string, any> = {};
      if (config.filters) {
        Object.entries(config.filters).forEach(([key, filter]) => {
          filtersJsonb[key] = {
            field: filter.field,
            operator: filter.operator,
            value: filter.value
          };
        });
      }

      // TODO: RPC function not yet available - temporarily return empty data
      console.warn('execute_simple_report RPC function not yet available');
      
      const result: ReportResult = {
        data: [],
        metadata: {
          row_count: 0,
          execution_time_ms: 0,
          data_source: config.data_source
        }
      };

      // Log execution
      if (result.data.length > 0) {
        await logReportExecution(config, result);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to execute report';
      setError(errorMessage);
      console.error('Report execution error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logReportExecution = async (config: ReportConfig, result: ReportResult) => {
    try {
      // TODO: report_execution_log table not yet available
      console.log('Report execution log (table not available):', {
        config,
        row_count: result.metadata.row_count,
        execution_time_ms: result.metadata.execution_time_ms
      });
    } catch (err) {
      // Log silently - don't fail report execution if logging fails
      console.error('Failed to log report execution:', err);
    }
  };

  return {
    executeReport,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

