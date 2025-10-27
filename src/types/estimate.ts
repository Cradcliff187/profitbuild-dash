export interface LineItem {
  id: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  pricePerUnit: number; // Replaces legacy 'rate' field
  total: number;
  unit?: string;
  sort_order?: number;
  
  // Cost & Pricing fields
  costPerUnit: number;
  markupPercent?: number | null;
  markupAmount?: number | null;
  
  // Calculated totals (generated columns)
  totalCost: number; // quantity * costPerUnit
  totalMarkup: number; // quantity * (pricePerUnit - costPerUnit)
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
  // Draft functionality
  is_draft?: boolean;
  // Contingency fields
  contingency_percent: number;
  contingency_amount?: number;
  contingency_used: number; // Only tracked during project execution, not during estimate creation
  // Versioning fields
  version_number: number;
  parent_estimate_id?: string;
  is_current_version: boolean;
  valid_for_days: number;
  // Markup and margin settings
  defaultMarkupPercent: number;
  targetMarginPercent: number;
  // For display purposes (populated from project)
  project_name?: string;
  project_number?: string;
  client_name?: string;
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

// Database compatible enum - values match Supabase
export enum LineItemCategory {
  LABOR = 'labor_internal',
  SUBCONTRACTOR = 'subcontractors', 
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  PERMITS = 'permits',
  MANAGEMENT = 'management',
  OTHER = 'other'
}

// Legacy support for existing forms
export const LEGACY_CATEGORY_MAP: Record<string, LineItemCategory> = {
  'Labor (Internal)': LineItemCategory.LABOR,
  'Subcontractors': LineItemCategory.SUBCONTRACTOR,
  'Materials': LineItemCategory.MATERIALS,
  'Equipment': LineItemCategory.EQUIPMENT,
  'Other': LineItemCategory.OTHER
};

export const CATEGORY_DISPLAY_MAP = {
  [LineItemCategory.LABOR]: 'Labor (Internal)',
  [LineItemCategory.SUBCONTRACTOR]: 'Subcontractors',
  [LineItemCategory.MATERIALS]: 'Materials',
  [LineItemCategory.EQUIPMENT]: 'Equipment',
  [LineItemCategory.PERMITS]: 'Permits & Fees',
  [LineItemCategory.MANAGEMENT]: 'Management',
  [LineItemCategory.OTHER]: 'Other'
};

// Version management types
export interface EstimateVersion {
  id: string;
  version_number: number;
  status: EstimateStatus;
  date_created: Date;
  total_amount: number;
  is_current_version: boolean;
  valid_until?: Date;
}

export interface VersionHistory {
  versions: EstimateVersion[];
  current_version: EstimateVersion;
  parent_estimate_id?: string;
}

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