export interface Payee {
  id: string;
  vendor_name: string;
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
  payee_type?: string;
  provides_labor?: boolean;
  provides_materials?: boolean;
  requires_1099?: boolean;
  is_internal?: boolean;
  insurance_expires?: string | null;
  license_number?: string;
  permit_issuer?: boolean;
  hourly_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayeeData {
  vendor_name: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
  full_name?: string;
  account_number?: string;
  terms?: string;
  payee_type?: string;
  provides_labor?: boolean;
  provides_materials?: boolean;
  requires_1099?: boolean;
  is_internal?: boolean;
  insurance_expires?: string | null;
  license_number?: string;
  permit_issuer?: boolean;
  hourly_rate?: number | null;
}

export interface UpdatePayeeData extends Partial<CreatePayeeData> {
  id: string;
}