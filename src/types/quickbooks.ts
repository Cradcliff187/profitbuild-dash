import { Database } from '@/integrations/supabase/types';

export type ExpenseCategory = Database['public']['Enums']['expense_category'];

export interface QuickBooksAccountMapping {
  id: string;
  app_category: ExpenseCategory;
  qb_account_name: string;
  qb_account_full_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountMappingData {
  app_category: ExpenseCategory;
  qb_account_name: string;
  qb_account_full_path: string;
}

export interface UpdateAccountMappingData extends Partial<CreateAccountMappingData> {
  id: string;
  is_active?: boolean;
}