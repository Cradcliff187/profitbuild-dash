export enum PayeeType {
  SUBCONTRACTOR = 'subcontractor',
  MATERIAL_SUPPLIER = 'material_supplier',
  EQUIPMENT_RENTAL = 'equipment_rental',
  INTERNAL_LABOR = 'internal_labor',
  MANAGEMENT = 'management',
  PERMIT_AUTHORITY = 'permit_authority',
  OTHER = 'other'
}

export interface Payee {
  id: string;
  payee_name: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
  full_name?: string;
  account_number?: string;
  terms?: string;
  is_active: boolean;
  quickbooks_vendor_id?: string;
  sync_status?: 'success' | 'failed' | 'pending' | null;
  last_synced_at?: string | null;
  payee_type?: PayeeType;
  provides_labor?: boolean;
  provides_materials?: boolean;
  requires_1099?: boolean;
  is_internal?: boolean;
  insurance_expires?: string | null;
  license_number?: string;
  permit_issuer?: boolean;
  hourly_rate?: number | null;
  employee_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayeeData {
  payee_name: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
  full_name?: string;
  account_number?: string;
  terms?: string;
  payee_type?: PayeeType;
  provides_labor?: boolean;
  provides_materials?: boolean;
  requires_1099?: boolean;
  is_internal?: boolean;
  insurance_expires?: string | null;
  license_number?: string;
  permit_issuer?: boolean;
  hourly_rate?: number | null;
  employee_number?: string;
  notes?: string;
}

export interface UpdatePayeeData extends Partial<CreatePayeeData> {
  id: string;
}