import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EstimateLineItemQuoteStatus {
  estimate_id: string;
  estimate_number: string;
  project_id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  line_item_id: string;
  category: string;
  description: string;
  quantity: number;
  price_per_unit: number;
  total: number;
  cost_per_unit: number;
  total_cost: number;
  unit: string | null;
  sort_order: number | null;
  quote_count: number;
  accepted_quote_count: number;
  pending_quote_count: number;
  rejected_quote_count: number;
  expired_quote_count: number;
  quote_details: Array<{
    quote_id: string;
    quote_number: string;
    vendor: string | null;
    vendor_id: string;
    status: string;
    total_amount: number;
    date_received: string | null;
    valid_until: string | null;
  }>;
  has_quotes: boolean;
  has_accepted_quote: boolean;
}

export interface EstimateQuoteStatusSummary {
  estimate_id: string;
  estimate_number: string;
  project_id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  total_line_items: number;
  line_items_with_quotes: number;
  line_items_without_quotes: number;
  line_items_with_accepted_quotes: number;
  quote_coverage_percent: number;
  total_quotes_received: number;
  total_accepted_quotes: number;
  total_pending_quotes: number;
  total_rejected_quotes: number;
  total_expired_quotes: number;
  total_estimate_amount: number;
  total_estimate_cost: number;
}

export function useEstimateQuoteStatus(estimateId?: string) {
  const [lineItems, setLineItems] = useState<EstimateLineItemQuoteStatus[]>([]);
  const [summary, setSummary] = useState<EstimateQuoteStatusSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (estimateId) {
      fetchData(estimateId);
    }
  }, [estimateId]);

  const fetchData = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Database views not yet created - temporarily return empty data
      console.warn('estimate_line_items_quote_status view not yet available');
      setLineItems([]);
      setSummary(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load estimate quote status');
      console.error('Error fetching estimate quote status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSummaries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Database views not yet created - temporarily return empty data
      console.warn('estimate_quote_status_summary view not yet available');
      return [];
    } catch (err: any) {
      setError(err.message || 'Failed to load estimate summaries');
      console.error('Error fetching estimate summaries:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    lineItems,
    summary,
    isLoading,
    error,
    fetchData,
    fetchAllSummaries,
    clearError: () => setError(null)
  };
}

