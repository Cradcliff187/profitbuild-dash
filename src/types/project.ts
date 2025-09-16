export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  client_name: string;
  address?: string;
  project_type: ProjectType;
  status: ProjectStatus;
  start_date?: Date;
  end_date?: Date;
  company_id: string;
  quickbooks_job_id?: string;
  sync_status?: 'success' | 'failed' | 'pending' | null;
  last_synced_at?: string | null;
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
  start_date?: Date;
  end_date?: Date;
}

// Utility function to generate project numbers
export const generateProjectNumber = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let result = '';
  // Generate 3 random letters
  for (let i = 0; i < 3; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  result += '-';
  // Generate 3 random numbers
  for (let i = 0; i < 3; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return result;
};