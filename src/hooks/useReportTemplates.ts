import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  category: 'financial' | 'operational' | 'client' | 'vendor' | 'schedule';
  config: any;
  is_template: boolean;
  created_at: string;
}

export function useReportTemplates() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [savedReports, setSavedReports] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: saved_reports table not yet available - temporarily return empty data
      console.warn('saved_reports table not yet available');
      setTemplates([]);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: saved_reports table not yet available - temporarily return empty data
      console.warn('saved_reports table not yet available');
      setSavedReports([]);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved reports');
      console.error('Error loading saved reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReport = async (
    name: string,
    description: string | null,
    category: ReportTemplate['category'],
    config: any,
    isTemplate: boolean = false
  ): Promise<string | null> => {
    try {
      // TODO: saved_reports table not yet available
      console.warn('saved_reports table not yet available - cannot save report');
      setError('Report saving not yet available');
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to save report');
      console.error('Error saving report:', err);
      return null;
    }
  };

  const deleteReport = async (reportId: string): Promise<boolean> => {
    try {
      // TODO: saved_reports table not yet available
      console.warn('saved_reports table not yet available - cannot delete report');
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to delete report');
      console.error('Error deleting report:', err);
      return false;
    }
  };

  useEffect(() => {
    loadTemplates();
    loadSavedReports();
  }, []);

  return {
    templates,
    savedReports,
    isLoading,
    error,
    loadTemplates,
    loadSavedReports,
    saveReport,
    deleteReport,
    clearError: () => setError(null)
  };
}

