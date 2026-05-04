/**
 * Invoice generation types — mirror of `src/types/contract.ts`.
 *
 * The pipeline is template-driven: a `.docx` in the `invoice-templates`
 * Storage bucket has `{{TOKEN}}` placeholders that map to nested paths in
 * `InvoiceFieldValues`. The `generate-invoice` edge function performs the
 * substitution and writes the result + a row in `invoices` + a row in
 * `project_documents`.
 */

export type InvoiceStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'paid'
  | 'void'
  | 'superseded';

/**
 * "Bill To" section — sourced from `clients` (via project.client_id) plus
 * any per-invoice override.
 */
export interface InvoiceCustomerInfo {
  /** Display name on the invoice (clients.client_name or company_name fallback). */
  name: string;
  /** First street-address line. Parsed from clients.billing_address. */
  streetAddress: string;
  /** "City, ST 12345" — parsed from clients.billing_address. */
  cityStateZip: string;
  /** Optional contact person line ("Attn: Jane Doe"). */
  contactPerson?: string;
  /** Optional contact email. */
  email?: string;
  /** Optional contact phone. */
  phone?: string;
}

/**
 * Project context for the invoice header.
 */
export interface InvoiceProjectInfo {
  /** "[225-005] Client - Project Name" composite line (matches contract pattern). */
  projectNameNumber: string;
  /** Bare project number, e.g. "225-005". */
  projectNumber: string;
  /** Bare project name. */
  projectName: string;
  /** Project address / job site. */
  location: string;
  /** Customer purchase-order number (from projects.customer_po_number). */
  poNumber: string;
}

/**
 * Per-invoice details. Populated mostly from `project_revenues` plus user
 * edits in the modal.
 */
export interface InvoiceDetails {
  /** User-visible invoice number (project_revenues.invoice_number). */
  invoiceNumber: string;
  /** ISO date YYYY-MM-DD — what the docx prints. */
  invoiceDate: string;
  /** Pre-formatted display date (e.g. "May 4, 2026"). */
  invoiceDateFormatted: string;
  /** Total invoice amount (numeric). */
  amount: number;
  /** Pre-formatted currency string ("$12,345.00"). */
  amountFormatted: string;
  /** ISO due date or empty string if none. */
  dueDate: string;
  /** Pre-formatted due-date display. */
  dueDateFormatted: string;
  /** Body description. ≤150 words; AI-drafted then user-edited. */
  description: string;
  /** Optional notes block (free-form). */
  notes?: string;
}

/**
 * RCG company defaults (copied from `company_settings`). Same shape as the
 * contract version so the same template-rendering helpers can be reused.
 */
export interface InvoiceRCGInfo {
  legalName: string;
  displayName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

/**
 * Complete payload sent to `generate-invoice` edge function.
 */
export interface InvoiceFieldValues {
  customer: InvoiceCustomerInfo;
  project: InvoiceProjectInfo;
  invoice: InvoiceDetails;
  rcg: InvoiceRCGInfo;
}

/**
 * Edge-function request body.
 */
export interface InvoiceGenerationRequest {
  projectId: string;
  revenueId: string;
  clientId?: string | null;
  estimateId?: string | null;
  fieldValues: InvoiceFieldValues;
  outputFormat: 'docx' | 'pdf' | 'both';
  saveToDocuments: boolean;
}

/**
 * Edge-function response body.
 */
export interface InvoiceGenerationResponse {
  success: boolean;
  invoiceId?: string;
  internalReference?: string;
  invoiceNumber?: string | null;
  docxUrl?: string;
  pdfUrl?: string;
  error?: string;
}

/**
 * `invoices` row shape (matches DB column names).
 */
export interface Invoice {
  id: string;
  project_id: string;
  client_id: string | null;
  internal_reference: string;
  invoice_number: string | null;
  amount: number;
  invoice_date: string;
  due_date: string | null;
  description: string | null;
  notes: string | null;
  field_values: InvoiceFieldValues;
  docx_storage_path: string | null;
  pdf_storage_path: string | null;
  docx_url: string | null;
  pdf_url: string | null;
  status: InvoiceStatus;
  version: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Validation result for invoice fields, mirrors `ContractFieldValidation`.
 */
export interface InvoiceFieldValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}
