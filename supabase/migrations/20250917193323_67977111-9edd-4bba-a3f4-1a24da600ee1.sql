-- Migration: Remove companies table and multi-company support
-- This simplifies the app to single-company use

-- Phase 1: Update RLS policies to allow all access instead of company filtering
DROP POLICY IF EXISTS "Users can access their company data" ON companies;
DROP POLICY IF EXISTS "Users can access projects from their company" ON projects;
DROP POLICY IF EXISTS "Users can access vendors from their company" ON vendors;
DROP POLICY IF EXISTS "Users can access their company account mappings" ON quickbooks_account_mappings;

-- Update all policies to allow access to all data
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all access to vendors" ON vendors FOR ALL USING (true);
CREATE POLICY "Allow all access to account mappings" ON quickbooks_account_mappings FOR ALL USING (true);

-- Update policies that filter by company indirectly through projects
DROP POLICY IF EXISTS "Users can access change orders from their company projects" ON change_orders;
DROP POLICY IF EXISTS "Users can access estimates from their company projects" ON estimates;
DROP POLICY IF EXISTS "Users can access expenses from their company projects" ON expenses;
DROP POLICY IF EXISTS "Users can access estimate line items from their company" ON estimate_line_items;
DROP POLICY IF EXISTS "Users can access quotes from their company projects" ON quotes;
DROP POLICY IF EXISTS "Users can access quote line items from their company" ON quote_line_items;

-- Recreate simplified policies without company filtering
CREATE POLICY "Allow all access to change orders" ON change_orders FOR ALL USING (true);
CREATE POLICY "Allow all access to estimates" ON estimates FOR ALL USING (true);
CREATE POLICY "Allow all access to expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all access to estimate line items" ON estimate_line_items FOR ALL USING (true);
CREATE POLICY "Allow all access to quotes" ON quotes FOR ALL USING (true);
CREATE POLICY "Allow all access to quote line items" ON quote_line_items FOR ALL USING (true);

-- Phase 2: Drop foreign key constraints referencing companies table
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_company_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_company_id_fkey;
ALTER TABLE quickbooks_account_mappings DROP CONSTRAINT IF EXISTS quickbooks_account_mappings_company_id_fkey;

-- Phase 3: Drop indexes on company_id columns
DROP INDEX IF EXISTS idx_vendors_company_id;
DROP INDEX IF EXISTS idx_projects_company_id;
DROP INDEX IF EXISTS idx_quickbooks_account_mappings_company_id;

-- Phase 4: Remove company_id columns from all tables
ALTER TABLE projects DROP COLUMN IF EXISTS company_id;
ALTER TABLE vendors DROP COLUMN IF EXISTS company_id;
ALTER TABLE quickbooks_account_mappings DROP COLUMN IF EXISTS company_id;

-- Phase 5: Drop the companies table
DROP TABLE IF EXISTS companies CASCADE;

-- Phase 6: Drop the utility function
DROP FUNCTION IF EXISTS public.get_user_company_id();