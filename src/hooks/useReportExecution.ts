import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between' | 'is_null' | 'is_not_null' | 'contains_any' | 'contains_only' | 'contains_all';
  value: any;
}

export interface ReportConfig {
  data_source: 'projects' | 'expenses' | 'quotes' | 'time_entries' | 'estimate_line_items' | 'internal_costs' | 'internal_labor_hours' | 'weekly_labor_hours' | 'reporting.training_status';
  filters?: Record<string, ReportFilter>;
  fields?: string[];
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
  limit?: number;
}

interface RPCResponse {
  data?: any[];
  metadata?: {
    row_count?: number;
    execution_time_ms?: number;
  };
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

      const { data, error } = await supabase.rpc('execute_simple_report', {
        p_data_source: config.data_source,
        p_filters: filtersJsonb,
        p_sort_by: config.sort_by || 'created_at',
        p_sort_dir: config.sort_dir || 'DESC',
        p_limit: config.limit || 100
      });

      if (error) {
        throw error;
      }

      const typedData = data as RPCResponse | null;

      const result: ReportResult = {
        data: (typedData?.data || []).map((item: any) => item.row_to_json || item),
        metadata: {
          row_count: typedData?.metadata?.row_count || 0,
          execution_time_ms: typedData?.metadata?.execution_time_ms || 0,
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
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('report_execution_log').insert({
        executed_by: user?.id,
        config_used: config as unknown as Json,
        row_count: result.metadata.row_count,
        execution_time_ms: result.metadata.execution_time_ms,
        export_format: null
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

