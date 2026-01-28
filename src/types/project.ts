export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  qb_formatted_number?: string;
  client_name: string;
  client_id?: string;
  address?: string;
  project_type: ProjectType;
  job_type?: string;
  status: ProjectStatus;
  category?: ProjectCategory;
  start_date?: Date;
  end_date?: Date;
  payment_terms?: string;
  quickbooks_job_id?: string;
  sync_status?: 'success' | 'failed' | 'pending' | null;
  last_synced_at?: string | null;
  contracted_amount?: number | null;
  total_accepted_quotes?: number | null;
  current_margin?: number | null;
  margin_percentage?: number | null;
  contingency_remaining?: number | null;
  minimum_margin_threshold?: number | null;
  target_margin?: number | null;
  original_margin?: number | null;
  projected_margin?: number | null;
  adjusted_est_costs?: number | null;
  original_est_costs?: number | null;
  notes?: string | null;
  customer_po_number?: string | null;
  do_not_exceed?: number | null;
  created_at: Date;
  updated_at: Date;
}

export type ProjectType = 'construction_project' | 'work_order';

export type ProjectStatus =
  | 'estimating'
  | 'approved'
  | 'in_progress'
  | 'complete'
  | 'on_hold'
  | 'cancelled';

// ============================================================================
// Project Category System
// ============================================================================
// Categories replace hardcoded project_number filtering:
// - 'construction': Real job projects (default) - visible everywhere
// - 'system': Internal projects (SYS-000, 000-UNASSIGNED) - completely hidden
// - 'overhead': Overhead buckets (001-GAS, 002-GA) - visible in expenses/receipts only

export type ProjectCategory = 'construction' | 'system' | 'overhead';

export interface CreateProjectRequest {
  project_name: string;
  client_name: string;
  address?: string;
  project_type: ProjectType;
  job_type?: string;
  start_date?: Date;
  end_date?: Date;
  payment_terms?: string;
  minimum_margin_threshold?: number;
  target_margin?: number;
}

export type MarginThresholdStatus = 
  | 'critical'
  | 'at_risk'
  | 'on_target'
  | 'excellent'
  | 'unknown';

export interface MarginThreshold {
  minimum: number;
  target: number;
  status: MarginThresholdStatus;
}

export const JOB_TYPES = [
  'Commercial',
  'Emergency Service',
  'Government',
  'Healthcare',
  'Industrial',
  'Maintenance',
  'Renovation',
  'Residential'
] as const;

export const PROJECT_STATUSES = [
  { value: 'estimating', label: 'Estimating' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' }
] as const;

// Project Media interface for photos/videos with location metadata
export interface ProjectMedia {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'video';
  mime_type: string;
  file_size: number;
  caption?: string;
  description?: string;
  taken_at?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  altitude?: number;
  device_model?: string;
  uploaded_by?: string;
  upload_source?: 'camera' | 'gallery' | 'web';
  duration?: number; // Duration in seconds for videos
  thumbnail_url?: string; // Generated thumbnail URL for videos
  created_at: string;
  updated_at: string;
}

// Utility function to generate project numbers using sequential hierarchy
export const generateProjectNumber = async (): Promise<string> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.rpc('get_next_project_number');
    
    if (error) {
      console.error('Error generating project number:', error);
      // Fallback to timestamp-based number if database call fails
      const timestamp = Date.now().toString().slice(-3);
      return `225-${timestamp}`;
    }
    
    return data;
  } catch (error) {
    console.error('Error generating project number:', error);
    // Fallback to timestamp-based number if import or database call fails
    const timestamp = Date.now().toString().slice(-3);
    return `225-${timestamp}`;
  }
};

// Synchronous fallback for immediate use (will be replaced by async version)
export const generateProjectNumberSync = (): string => {
  const timestamp = Date.now().toString().slice(-3);
  return `225-${timestamp}`;
};

// ============================================================================
// Category-Based Helper Functions (Preferred - Use These Going Forward)
// ============================================================================

/**
 * Check if project is a construction project (real job)
 * Returns true for undefined/null category for backward compatibility
 */
export const isConstructionProject = (category?: ProjectCategory | null): boolean => 
  category === 'construction' || category === undefined || category === null;

/**
 * Check if project is an overhead project (001-GAS, 002-GA, etc.)
 * These are visible only in expense and receipt contexts
 */
export const isOverheadProject = (category?: ProjectCategory | null): boolean => 
  category === 'overhead';

/**
 * Check if project is a system project (SYS-000, 000-UNASSIGNED)
 * These are completely hidden from users
 */
export const isSystemProjectByCategory = (category?: ProjectCategory | null): boolean => 
  category === 'system';

/**
 * Check if project should be shown in general lists (dashboard, projects page)
 * Only construction projects should appear
 */
export const shouldShowInConstructionLists = (category?: ProjectCategory | null): boolean => 
  isConstructionProject(category);

/**
 * Check if project should be shown in expense/receipt selectors
 * Both construction and overhead projects should appear
 */
export const shouldShowInExpenseContext = (category?: ProjectCategory | null): boolean => 
  category === 'construction' || category === 'overhead';

/**
 * Get the appropriate Supabase filter for construction-only contexts
 */
export const getConstructionFilter = (): ProjectCategory => 'construction';

/**
 * Get the appropriate Supabase filter for expense contexts
 */
export const getExpenseContextFilter = (): ProjectCategory[] => ['construction', 'overhead'];

// ============================================================================
// Legacy Helpers (Keep for Backward Compatibility During Transition)
// ============================================================================

// System placeholder projects - completely hidden from users
export const SYSTEM_PROJECT_NUMBERS = ['SYS-000', '000-UNASSIGNED'] as const;

// Operational projects - visible only in time tracking & expenses
export const OPERATIONAL_PROJECT_NUMBERS = ['001-GAS'] as const;

export type SystemProjectNumber = typeof SYSTEM_PROJECT_NUMBERS[number];
export type OperationalProjectNumber = typeof OPERATIONAL_PROJECT_NUMBERS[number];

// Helper functions
export const isSystemProject = (projectNumber: string): boolean => {
  return SYSTEM_PROJECT_NUMBERS.includes(projectNumber as SystemProjectNumber);
};

export const isOperationalProject = (projectNumber: string): boolean => {
  return OPERATIONAL_PROJECT_NUMBERS.includes(projectNumber as OperationalProjectNumber);
};

export const shouldShowInGeneralLists = (projectNumber: string): boolean => {
  return !isSystemProject(projectNumber) && !isOperationalProject(projectNumber);
};