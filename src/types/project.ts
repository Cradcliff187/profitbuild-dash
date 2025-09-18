export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  qb_formatted_number?: string;
  client_name: string;
  address?: string;
  project_type: ProjectType;
  job_type?: string;
  status: ProjectStatus;
  start_date?: Date;
  end_date?: Date;
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
  created_at: Date;
  updated_at: Date;
}

export type ProjectType = 'construction_project' | 'work_order';

export type ProjectStatus = 
  | 'estimating'
  | 'quoted' 
  | 'approved'
  | 'in_progress'
  | 'complete'
  | 'on_hold'
  | 'cancelled';

export interface CreateProjectRequest {
  project_name: string;
  client_name: string;
  address?: string;
  project_type: ProjectType;
  job_type?: string;
  start_date?: Date;
  end_date?: Date;
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
  'Residential',
  'Commercial',
  'Government',
  'Industrial',
  'Renovation',
  'Emergency Service',
  'Maintenance'
] as const;

// Utility function to generate project numbers
export const generateProjectNumber = (): string => {
  const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${numbers}-${suffix}`; // Format: 125-098
};