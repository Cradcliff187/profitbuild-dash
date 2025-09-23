import { supabase } from "@/integrations/supabase/client";

/**
 * Utility functions for hierarchical number generation
 * Provides fallback functionality when database functions aren't available
 */

export const generateWorkOrderNumber = async (projectId: string, projectNumber: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_work_order_number', {
      project_number_param: projectNumber,
      project_id_param: projectId
    });
    
    if (error) {
      console.error('Error generating work order number:', error);
      // Fallback: get current work order count for this project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('work_order_counter')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('Error fetching project for fallback:', projectError);
        return `${projectNumber}-WO-01`;
      }
      
      const nextCounter = (projectData.work_order_counter || 0) + 1;
      return `${projectNumber}-WO-${nextCounter.toString().padStart(2, '0')}`;
    }
    
    return data;
  } catch (error) {
    console.error('Error generating work order number:', error);
    return `${projectNumber}-WO-01`;
  }
};

export const formatChangeOrderWithProject = (changeOrderNumber: string, projectNumber: string): string => {
  return `${projectNumber} / ${changeOrderNumber}`;
};

export const extractProjectCounter = (projectNumber: string): number => {
  // Extract the counter from project number format "125-XXX"
  const parts = projectNumber.split('-');
  if (parts.length === 2) {
    return parseInt(parts[1], 10);
  }
  return 0;
};

export const formatProjectNumber = (counter: number): string => {
  // Format counter as "125-XXX"
  return `125-${counter}`;
};