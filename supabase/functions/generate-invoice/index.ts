import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Placeholder → nested-path mapping for the invoice .docx template.
 * The template lives in the `invoice-templates` Storage bucket.
 *
 * Field-value shape: see src/types/invoice.ts InvoiceFieldValues.
 */
const PLACEHOLDERS: Record<string, string> = {
  // Customer (Bill To)
  '{{CUSTOMER_NAME}}': 'customer.name',
  '{{CUSTOMER_STREET_ADDRESS}}': 'customer.streetAddress',
  '{{CUSTOMER_CITY_STATE_ZIP}}': 'customer.cityStateZip',
  '{{CUSTOMER_CONTACT}}': 'customer.contactPerson',
  '{{CUSTOMER_EMAIL}}': 'customer.email',
  '{{CUSTOMER_PHONE}}': 'customer.phone',

  // Project
  '{{PROJECT_NAME_NUMBER}}': 'project.projectNameNumber',
  '{{PROJECT_NUMBER}}': 'project.projectNumber',
  '{{PROJECT_NAME}}': 'project.projectName',
  '{{PROJECT_LOCATION}}': 'project.location',
  '{{PO_NUMBER}}': 'project.poNumber',

  // Invoice
  '{{INVOICE_NUMBER}}': 'invoice.invoiceNumber',
  '{{INVOICE_DATE}}': 'invoice.invoiceDateFormatted',
  '{{INVOICE_DATE_ISO}}': 'invoice.invoiceDate',
  '{{DUE_DATE}}': 'invoice.dueDateFormatted',
  '{{DUE_DATE_ISO}}': 'invoice.dueDate',
  '{{INVOICE_AMOUNT}}': 'invoice.amountFormatted',
  '{{TOTAL_DUE}}': 'invoice.amountFormatted',
  '{{INVOICE_DESCRIPTION}}': 'invoice.description',
  '{{INVOICE_NOTES}}': 'invoice.notes',

  // RCG (header / payable-to copy)
  '{{RCG_LEGAL_NAME}}': 'rcg.legalName',
  '{{RCG_DISPLAY_NAME}}': 'rcg.displayName',
  '{{RCG_ADDRESS}}': 'rcg.address',
  '{{RCG_PHONE}}': 'rcg.phone',
  '{{RCG_EMAIL}}': 'rcg.email',
  '{{RCG_WEBSITE}}': 'rcg.website',
};

const INVOICE_TEMPLATE_FILENAME = 'rcg-invoice-template.docx';

/** Fields that should render multi-line via <w:br/> separators inside the docx run. */
const MULTILINE_PATHS = new Set([
  'invoice.description',
  'invoice.notes',
  'customer.streetAddress', // safe — usually one line, but supports multi-line addresses
]);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const value = path
    .split('.')
    .reduce((cur: unknown, key) => (cur as Record<string, unknown>)?.[key], obj);
  return value != null ? String(value) : '';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Word often splits placeholder text across runs (e.g. `{{INVOICE_` in one run
 * and `NUMBER}}` in another). Strip XML tags inside any `{{...}}` to make the
 * substitution operate on contiguous text. Mirrors generate-contract.
 */
function normalizePlaceholderRuns(xml: string): string {
  return xml.replace(/\{\{([^{}]*(?:<[^>]*>[^{}]*)*)\}\}/g, (match) =>
    match.replace(/<[^>]*>/g, '')
  );
}

/** Build OOXML so multi-line text renders with <w:br/> between paragraphs. */
function buildMultiLineOoxml(displayValue: string): string {
  const lines = displayValue.split('\n').map((s) => escapeXml(s));
  if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
    return `</w:t><w:t></w:t><w:t>`;
  }
  const runs = lines
    .map((escaped, i) =>
      i === 0
        ? `<w:t xml:space="preserve">${escaped}</w:t>`
        : `<w:br/><w:t xml:space="preserve">${escaped}</w:t>`
    )
    .join('');
  return `</w:t>${runs}<w:t>`;
}

function replacePlaceholders(xml: string, fieldValues: Record<string, unknown>): string {
  let result = normalizePlaceholderRuns(xml);
  const replacements: Record<string, string> = {};
  for (const [placeholder, path] of Object.entries(PLACEHOLDERS)) {
    const raw = getNestedValue(fieldValues, path);
    replacements[placeholder] = raw || '[EMPTY]';
    const display = raw || '';
    const escaped = MULTILINE_PATHS.has(path)
      ? buildMultiLineOoxml(display)
      : escapeXml(display);
    const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
    result = result.replace(new RegExp(escapedPlaceholder, 'g'), escaped);
  }
  console.log('Invoice placeholder replacements:', JSON.stringify(replacements, null, 2));
  return result;
}

/** Build initials from a client name (2-3 chars). */
function getClientInitials(clientName: string): string {
  if (!clientName) return 'XX';
  const cleaned = clientName.replace(/[&,.'"\-_]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const initials = words
    .map((w) => (w[0] ?? '').toUpperCase())
    .filter((c) => /[A-Z]/.test(c))
    .join('');
  return initials.slice(0, 3) || 'XX';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json()) as {
      projectId?: string;
      revenueId?: string;
      clientId?: string | null;
      estimateId?: string | null;
      fieldValues?: Record<string, unknown>;
      outputFormat?: 'docx' | 'pdf' | 'both';
      saveToDocuments?: boolean;
    };

    const {
      projectId,
      revenueId,
      clientId,
      fieldValues,
      outputFormat = 'docx',
      saveToDocuments = true,
    } = body;

    if (!projectId || !revenueId || !fieldValues) {
      throw new Error('Missing required fields: projectId, revenueId, fieldValues');
    }

    // ── Fetch template ───────────────────────────────────────────────────
    const { data: templateData, error: templateError } = await supabase.storage
      .from('invoice-templates')
      .download(INVOICE_TEMPLATE_FILENAME);

    if (templateError || !templateData) {
      throw new Error(
        `Failed to fetch invoice template '${INVOICE_TEMPLATE_FILENAME}'. ${
          templateError?.message ?? 'No file found in invoice-templates bucket.'
        }`
      );
    }

    const zip = await new JSZip().loadAsync(await (templateData as Blob).arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Invalid template: missing word/document.xml');
    }

    // ── Substitute placeholders in document.xml ──────────────────────────
    zip.file('word/document.xml', replacePlaceholders(documentXml, fieldValues));

    // Headers and footers may also reference placeholders (RCG header copy).
    const headerFiles = Object.keys(zip.files).filter((f) =>
      /^word\/header\d+\.xml$/.test(f)
    );
    const footerFiles = Object.keys(zip.files).filter((f) =>
      /^word\/footer\d+\.xml$/.test(f)
    );
    for (const f of headerFiles) {
      const content = await zip.file(f)?.async('string');
      if (content) zip.file(f, replacePlaceholders(content, fieldValues));
    }
    for (const f of footerFiles) {
      const content = await zip.file(f)?.async('string');
      if (content) zip.file(f, replacePlaceholders(content, fieldValues));
    }

    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // ── Compute internal_reference (versioned per project + client) ──────
    const customerName = getNestedValue(fieldValues, 'customer.name');
    const initials = getClientInitials(customerName);

    const { data: projectRow } = await supabase
      .from('projects')
      .select('project_number')
      .eq('id', projectId)
      .single();
    const projectNumberPart = (projectRow?.project_number ?? 'NEW').replace(/-/g, '');

    const { data: existingRefs } = await supabase
      .from('invoices')
      .select('internal_reference')
      .eq('project_id', projectId);

    const baseRef = `INV-${initials}-${projectNumberPart}`;
    const usedSuffixes = new Set(
      ((existingRefs ?? []) as Array<{ internal_reference: string }>)
        .map((r) => {
          const m = r.internal_reference.match(
            new RegExp(`^${baseRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d{2,})$`)
          );
          return m ? parseInt(m[1], 10) : NaN;
        })
        .filter((n) => Number.isFinite(n)) as number[]
    );
    let v = 1;
    while (usedSuffixes.has(v)) v++;
    const internalReference = `${baseRef}-${String(v).padStart(2, '0')}`;
    console.log(`Generated invoice internal reference: ${internalReference}`);

    // ── Upload docx to project-documents storage ─────────────────────────
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${internalReference}_Invoice_${timestamp}`;
    const docxPath = `invoices/${projectId}/${baseFilename}.docx`;

    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(docxPath, docxBuffer, {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`Failed to upload DOCX: ${uploadError.message}`);
    }
    const { data: urlData } = supabase.storage
      .from('project-documents')
      .getPublicUrl(docxPath);
    const docxUrl = urlData.publicUrl;

    // PDF generation: not implemented in this phase. Same shape as the contract
    // function — return docx only when 'pdf'/'both' is requested.
    if (outputFormat === 'pdf' || outputFormat === 'both') {
      console.log('Invoice PDF generation not yet implemented — returning DOCX only');
    }

    // ── Insert invoices row ──────────────────────────────────────────────
    const invoiceNumber = getNestedValue(fieldValues, 'invoice.invoiceNumber') || null;
    const invoiceDateIso = getNestedValue(fieldValues, 'invoice.invoiceDate') || timestamp;
    const dueDateIso = getNestedValue(fieldValues, 'invoice.dueDate') || null;
    const description = getNestedValue(fieldValues, 'invoice.description') || null;
    const notes = getNestedValue(fieldValues, 'invoice.notes') || null;
    const amountStr = getNestedValue(fieldValues, 'invoice.amount');
    const amount = Number(amountStr) || 0;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        project_id: projectId,
        client_id: clientId || null,
        internal_reference: internalReference,
        invoice_number: invoiceNumber,
        amount,
        invoice_date: invoiceDateIso,
        due_date: dueDateIso,
        description,
        notes,
        field_values: fieldValues,
        docx_storage_path: docxPath,
        docx_url: docxUrl,
        pdf_storage_path: null,
        pdf_url: null,
        status: 'generated',
        version: v,
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice record: ${invoiceError.message}`);
    }

    // ── Junction row for Phase 2 aggregation readiness ───────────────────
    const { error: junctionError } = await supabase.from('invoice_revenues').insert({
      invoice_id: invoice.id,
      revenue_id: revenueId,
    });
    if (junctionError) {
      console.warn('Failed to insert invoice_revenues junction row:', junctionError.message);
    }

    // ── Cross-link in project_documents (matches contract pattern) ───────
    if (saveToDocuments) {
      const { error: docErr } = await supabase.from('project_documents').insert({
        project_id: projectId,
        file_name: `${baseFilename}.docx`,
        file_url: docxUrl,
        file_size: (docxBuffer as ArrayBuffer).byteLength,
        mime_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        document_type: 'invoice',
        description: `Invoice ${invoiceNumber ?? internalReference}${
          customerName ? ` — ${customerName}` : ''
        }`,
      });
      if (docErr) {
        console.warn('Could not add invoice to project_documents:', docErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        internalReference,
        invoiceNumber,
        docxUrl,
        pdfUrl: null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Invoice generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
