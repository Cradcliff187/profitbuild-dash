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
}

export interface UpdatePayeeData extends Partial<CreatePayeeData> {
  id: string;
}