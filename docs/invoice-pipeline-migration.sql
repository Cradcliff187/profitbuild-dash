-- Migration: invoice generation pipeline (Phase 1: single revenue → single invoice)
-- Apply via MCP `apply_migration` named `add_invoice_generation_pipeline`.
-- After apply: regenerate Supabase types (`mcp generate_typescript_types`) and
-- create a placeholder file under `supabase/migrations/{version}_{name}.sql` per
-- CLAUDE.md "Critical Migration Rules".

-- ---------------------------------------------------------------------------
-- 1. invoices table — mirrors `contracts` shape
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  internal_reference text NOT NULL UNIQUE,
  invoice_number text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  invoice_date date NOT NULL,
  due_date date,
  description text,
  notes text,
  field_values jsonb NOT NULL,
  docx_storage_path text,
  pdf_storage_path text,
  docx_url text,
  pdf_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generated','sent','paid','void','superseded')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- ---------------------------------------------------------------------------
-- 2. invoice_revenues junction (Phase-2-ready; populated 1:1 in Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoice_revenues (
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  revenue_id uuid NOT NULL REFERENCES public.project_revenues(id) ON DELETE RESTRICT,
  PRIMARY KEY (invoice_id, revenue_id)
);

CREATE INDEX idx_invoice_revenues_revenue_id ON public.invoice_revenues(revenue_id);

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger (reuse existing helper if present)
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Cascade-delete-related-project-documents trigger
--    (mirrors the contracts pattern; cleans up project_documents when an
--     invoice row is deleted so file references don't dangle)
-- ---------------------------------------------------------------------------
-- Mirrors the existing contracts_delete_cascade trigger: project_documents
-- cross-references by file_url (not by storage_path), so we match on URL.
CREATE OR REPLACE FUNCTION public.delete_related_project_documents_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.docx_url IS NOT NULL THEN
    DELETE FROM public.project_documents
    WHERE file_url = OLD.docx_url;
  END IF;
  IF OLD.pdf_url IS NOT NULL THEN
    DELETE FROM public.project_documents
    WHERE file_url = OLD.pdf_url;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER invoices_delete_cascade
  BEFORE DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.delete_related_project_documents_invoice();

-- ---------------------------------------------------------------------------
-- 5. RLS — mirror contracts policies (admin/manager full, field worker none)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_revenues ENABLE ROW LEVEL SECURITY;

-- Admins and managers can do everything
CREATE POLICY "Admins and managers can manage invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager')
    )
  );

CREATE POLICY "Admins and managers can manage invoice_revenues"
  ON public.invoice_revenues
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Storage bucket: invoice-templates (private, service-role only)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-templates', 'invoice-templates', false)
ON CONFLICT (id) DO NOTHING;

-- No storage policies = service-role only (matches contract-templates).

-- ---------------------------------------------------------------------------
-- DONE
-- ---------------------------------------------------------------------------
