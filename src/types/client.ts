export interface Client {
  id: string;
  client_name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  mailing_address?: string;
  client_type: ClientType;
  payment_terms: string;
  tax_exempt: boolean;
  is_active: boolean;
  notes?: string;
  quickbooks_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export type ClientType = 'residential' | 'commercial' | 'government' | 'nonprofit';

export interface CreateClientRequest {
  client_name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  mailing_address?: string;
  client_type: ClientType;
  payment_terms?: string;
  tax_exempt?: boolean;
  notes?: string;
}

export const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'government', label: 'Government' },
  { value: 'nonprofit', label: 'Non-Profit' },
];