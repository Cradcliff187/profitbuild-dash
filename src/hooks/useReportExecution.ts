import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between' | 'is_null';
  value: any;
}

export interface ReportConfig {
  data_source: 'projects' | 'expenses' | 'quotes' | 'time_entries';
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

      const { data, error: rpcError } = await supabase.rpc('execute_simple_report', {
        p_data_source: config.data_source,
        p_filters: filtersJsonb,
        p_sort_by: config.sort_by || 'created_at',
        p_sort_dir: config.sort_dir || 'DESC',
        p_limit: config.limit || 100
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data) {
        throw new Error('No data returned from report execution');
      }

      // Parse the JSONB response
      // Unwrap row_to_json wrapper from database results
      const rawData = data.data || [];
      const unwrappedData = rawData.map((row: any) => {
        // Handle row_to_json wrapper structure
        if (row && row.row_to_json) {
          return row.row_to_json;
        }
        // If already unwrapped or different structure, return as-is
        return row;
      });

      const result: ReportResult = {
        data: unwrappedData,
        metadata: data.metadata || {
          row_count: unwrappedData.length,
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
      await supabase.from('report_execution_log').insert({
        executed_by: (await supabase.auth.getUser()).data.user?.id,
        execution_time_ms: result.metadata.execution_time_ms,
        row_count: result.metadata.row_count,
        config_used: config as any
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

