export interface LineItem {
  id: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  unit?: string;
  sort_order?: number;
}

export interface Estimate {
  id: string;
  project_id: string;
  estimate_number: string;
  date_created: Date;
  total_amount: number;
  status: EstimateStatus;
  notes?: string;
  valid_until?: Date;
  revision_number: number;
  lineItems: LineItem[];
  created_at: Date;
  updated_at: Date;
  // For display purposes (populated from project)
  project_name?: string;
  client_name?: string;
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

// Database enum values - must match Supabase
export type LineItemCategory = 
  | 'labor_internal' 
  | 'subcontractors' 
  | 'materials' 
  | 'equipment' 
  | 'other';

// Legacy support for existing forms
export const LEGACY_CATEGORY_MAP: Record<string, LineItemCategory> = {
  'Labor (Internal)': 'labor_internal',
  'Subcontractors': 'subcontractors',
  'Materials': 'materials',
  'Equipment': 'equipment',
  'Other': 'other'
};

export const CATEGORY_DISPLAY_MAP: Record<LineItemCategory, string> = {
  'labor_internal': 'Labor (Internal)',
  'subcontractors': 'Subcontractors',
  'materials': 'Materials',
  'equipment': 'Equipment',
  'other': 'Other'
};

// Legacy interface for backward compatibility
export interface LegacyEstimate {
  id: string;
  projectName: string;
  client: string;
  date: Date;
  estimateNumber: string;
  lineItems: LineItem[];
  subtotals: {
    labor: number;
    subcontractors: number;
    materials: number;
    equipment: number;
    other: number;
  };
  total: number;
  createdAt: Date;
}