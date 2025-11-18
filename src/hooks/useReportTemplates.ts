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
      const { data, error: fetchError } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('is_template', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setTemplates((data as ReportTemplate[]) || []);
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error: fetchError } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('is_template', false)
        .eq('created_by', userData.user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setSavedReports((data as ReportTemplate[]) || []);
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { data, error: insertError } = await supabase
        .from('saved_reports')
        .insert({
          name,
          description,
          category,
          config,
          is_template: isTemplate,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Refresh saved reports if not a template
      if (!isTemplate) {
        await loadSavedReports();
      }

      return data.id;
    } catch (err: any) {
      setError(err.message || 'Failed to save report');
      console.error('Error saving report:', err);
      return null;
    }
  };

  const deleteReport = async (reportId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh saved reports
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

