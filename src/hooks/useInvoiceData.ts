import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceFieldValues, InvoiceRCGInfo } from '@/types/invoice';
import {
  computeDueDate,
  formatCurrency,
  formatInvoiceDateDisplay,
  formatInvoiceDateIso,
  formatProjectNameNumber,
  parseAddressOneLine,
} from '@/utils/invoiceFormatters';

interface UseInvoiceDataParams {
  projectId: string;
  revenueId: string;
  clientId?: string | null;
}

interface UseInvoiceDataResult {
  fieldValues: InvoiceFieldValues | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Loads everything needed to prefill the invoice generation modal:
 * project + client + revenue + company_settings (for RCG defaults).
 *
 * Mirrors the shape of `useContractData`. Description is intentionally left
 * blank — the modal calls `useGenerateInvoiceDescription` to draft it.
 */
export function useInvoiceData({
  projectId,
  revenueId,
  clientId,
}: UseInvoiceDataParams): UseInvoiceDataResult {
  const [fieldValues, setFieldValues] = useState<InvoiceFieldValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId || !revenueId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const [projectResult, revenueResult, settingsResult] = await Promise.all([
        supabase
          .from('projects')
          .select(
            'id, project_number, project_name, address, client_id, client_name, customer_po_number, payment_terms'
          )
          .eq('id', projectId)
          .single(),
        supabase
          .from('project_revenues')
          .select('id, invoice_number, invoice_date, amount, description, client_id')
          .eq('id', revenueId)
          .single(),
        supabase.from('company_settings').select('setting_key, setting_value'),
      ]);

      if (projectResult.error) throw new Error(`Project: ${projectResult.error.message}`);
      if (revenueResult.error) throw new Error(`Revenue: ${revenueResult.error.message}`);
      if (settingsResult.error) throw new Error(`Settings: ${settingsResult.error.message}`);

      const project = projectResult.data as {
        project_number: string | null;
        project_name: string | null;
        address: string | null;
        client_id: string | null;
        client_name: string | null;
        customer_po_number: string | null;
        payment_terms: string | null;
      };
      const revenue = revenueResult.data as {
        invoice_number: string | null;
        invoice_date: string | null;
        amount: number | null;
        description: string | null;
        client_id: string | null;
      };

      // Resolve client_id: explicit param > revenue.client_id > project.client_id.
      const resolvedClientId =
        clientId || revenue.client_id || project.client_id || null;

      let client: {
        client_name?: string | null;
        company_name?: string | null;
        contact_person?: string | null;
        billing_address?: string | null;
        mailing_address?: string | null;
        email?: string | null;
        phone?: string | null;
        payment_terms?: string | null;
      } | null = null;
      if (resolvedClientId) {
        const clientRes = await supabase
          .from('clients')
          .select(
            'client_name, company_name, contact_person, billing_address, mailing_address, email, phone, payment_terms'
          )
          .eq('id', resolvedClientId)
          .single();
        if (clientRes.error) {
          console.warn('Client load failed (will use project.client_name fallback):', clientRes.error.message);
        } else {
          client = clientRes.data;
        }
      }

      const settings = (settingsResult.data || []) as {
        setting_key: string;
        setting_value: string;
      }[];
      const settingsMap = new Map(settings.map((s) => [s.setting_key, s.setting_value]));

      const rcg: InvoiceRCGInfo = {
        legalName:
          settingsMap.get('company_legal_name') ??
          'Radcliff Construction Group, LLC',
        displayName:
          settingsMap.get('company_display_name') ??
          'Radcliff Construction Group, LLC',
        address:
          settingsMap.get('company_address') ??
          '2327 Anderson Rd, Crescent Springs, KY 41017',
        phone: settingsMap.get('company_phone') ?? '(859) 802-0746',
        email: settingsMap.get('company_email') ?? 'Finance@Radcliffcg.com',
        website: settingsMap.get('company_website') ?? 'teamradcliff.com',
      };

      // ── Customer (Bill To) — clients > fallback to project.client_name ──
      const customerName =
        client?.company_name?.trim() ||
        client?.client_name?.trim() ||
        project.client_name ||
        '';
      const billingAddress =
        client?.billing_address?.trim() ||
        client?.mailing_address?.trim() ||
        '';
      const parsedAddr = parseAddressOneLine(billingAddress);

      // ── Dates ──────────────────────────────────────────────────────────
      const invoiceDateObj = revenue.invoice_date
        ? new Date(revenue.invoice_date)
        : new Date();
      const paymentTermsForDue =
        client?.payment_terms ?? project.payment_terms ?? null;
      const dueDateObj = computeDueDate(invoiceDateObj, paymentTermsForDue);

      const amount = Number(revenue.amount ?? 0);

      const values: InvoiceFieldValues = {
        customer: {
          name: customerName,
          streetAddress: parsedAddr.street,
          cityStateZip: parsedAddr.cityStateZip,
          contactPerson: client?.contact_person ?? '',
          email: client?.email ?? '',
          phone: client?.phone ?? '',
        },
        project: {
          // No client-name suffix here — the customer is already shown in
          // "Bill To" so duplicating it just makes the cell wrap.
          projectNameNumber: formatProjectNameNumber(
            project.project_number ?? null,
            project.project_name ?? null,
            null
          ),
          projectNumber: project.project_number ?? '',
          projectName: project.project_name ?? '',
          location: project.address ?? '',
          poNumber: project.customer_po_number ?? '',
        },
        invoice: {
          invoiceNumber: revenue.invoice_number ?? '',
          invoiceDate: formatInvoiceDateIso(invoiceDateObj),
          invoiceDateFormatted: formatInvoiceDateDisplay(invoiceDateObj),
          amount,
          amountFormatted: formatCurrency(amount),
          dueDate: formatInvoiceDateIso(dueDateObj),
          dueDateFormatted: formatInvoiceDateDisplay(dueDateObj),
          // Seed description from revenue's existing description column;
          // user can replace via the Auto-draft button or edit free-form.
          description: revenue.description ?? '',
          notes: '',
        },
        rcg,
      };

      setFieldValues(values);
    } catch (err) {
      console.error('Error fetching invoice data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice data');
      setFieldValues(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, revenueId, clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    fieldValues,
    isLoading,
    error,
    refetch: fetchData,
  };
}
