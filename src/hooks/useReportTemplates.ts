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
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('is_template', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as ReportTemplate[]);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSavedReports([]);
        return;
      }

      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedReports((data || []) as ReportTemplate[]);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('saved_reports')
        .insert({
          name,
          description,
          category,
          config,
          is_template: isTemplate,
          created_by: user.id
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Refresh saved reports list
      await loadSavedReports();
      
      return data?.id || null;
    } catch (err: any) {
      setError(err.message || 'Failed to save report');
      console.error('Error saving report:', err);
      return null;
    }
  };

  const deleteReport = async (reportId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      // Refresh saved reports list
      await loadSavedReports();
      
      return true;
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

