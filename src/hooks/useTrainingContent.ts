/**
 * @file useTrainingContent.ts
 * @description Hook for managing training content (admin operations)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrainingContent, 
  CreateTrainingContentData, 
  UpdateTrainingContentData,
  TrainingStatus 
} from '@/types/training';
import { toast } from 'sonner';

export function useTrainingContent() {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all content (admin view)
  const fetchContent = useCallback(async (statusFilter?: TrainingStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('training_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setContent(data || []);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching training content:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create content
  const createContent = async (data: CreateTrainingContentData): Promise<TrainingContent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newContent, error } = await supabase
        .from('training_content')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setContent(prev => [newContent, ...prev]);
      toast.success('Training content created');
      return newContent;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to create content', { description: error.message });
      return null;
    }
  };

  // Update content
  const updateContent = async (data: UpdateTrainingContentData): Promise<TrainingContent | null> => {
    try {
      const { id, ...updates } = data;
      
      const { data: updated, error } = await supabase
        .from('training_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setContent(prev => prev.map(c => c.id === id ? updated : c));
      toast.success('Training content updated');
      return updated;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to update content', { description: error.message });
      return null;
    }
  };

  // Delete content
  const deleteContent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContent(prev => prev.filter(c => c.id !== id));
      toast.success('Training content deleted');
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to delete content', { description: error.message });
      return false;
    }
  };

  // Publish/unpublish content
  const setContentStatus = async (id: string, status: TrainingStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_content')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setContent(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(`Content ${status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'set to draft'}`);
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to update status', { description: error.message });
      return false;
    }
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    content,
    isLoading,
    error,
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
    setContentStatus,
    refresh: fetchContent,
  };
}

