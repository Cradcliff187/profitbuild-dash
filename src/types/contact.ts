export type ContactRole =
  | 'billing'
  | 'estimating'
  | 'project_management'
  | 'site'
  | 'signatory'
  | 'insurance'
  | 'sales'
  | 'other';

export interface Contact {
  id: string;
  client_id: string | null;
  payee_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  role: ContactRole | null;
  is_primary: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  billing: 'Billing / AP',
  estimating: 'Estimating',
  project_management: 'Project Management',
  site: 'Site / Field',
  signatory: 'Signatory',
  insurance: 'Insurance',
  sales: 'Sales',
  other: 'Other',
};
