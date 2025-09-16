export interface Vendor {
  id: string;
  vendor_name: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
  full_name?: string;
  account_number?: string;
  is_active: boolean;
  company_id: string;
  quickbooks_vendor_id?: string;
  sync_status?: 'success' | 'failed' | 'pending' | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorData {
  vendor_name: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
  full_name?: string;
  account_number?: string;
}

export interface UpdateVendorData extends Partial<CreateVendorData> {
  id: string;
}