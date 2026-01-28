import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLACEHOLDERS: Record<string, string> = {
  '{{SUBCONTRACTOR_COMPANY}}': 'subcontractor.company',
  '{{SUBCONTRACTOR_CONTACT}}': 'subcontractor.contactName',
  '{{SUBCONTRACTOR_PHONE}}': 'subcontractor.phone',
  '{{SUBCONTRACTOR_EMAIL}}': 'subcontractor.email',
  '{{SUBCONTRACTOR_ADDRESS}}': 'subcontractor.address',
  '{{SUBCONTRACTOR_ADDRESS_FORMATTED}}': 'subcontractor.addressFormatted',
  '{{SUBCONTRACTOR_STREET_ADDRESS}}': 'subcontractor.streetAddress',
  '{{SUBCONTRACTOR_CITY_STATE_ZIP}}': 'subcontractor.cityStateZip',
  '{{SUBCONTRACTOR_LEGAL_FORM}}': 'subcontractor.legalForm',
  '{{SUBCONTRACTOR_STATE}}': 'subcontractor.stateOfFormation',
  '{{SUBCONTRACTOR_TITLE}}': 'subcontractor.contactTitle',
  '{{SUBCONTRACTOR_LEGAL_ENTITY}}': 'subcontractor.legalEntity',
  '{{PROJECT_NAME_NUMBER}}': 'project.projectNameNumber',
  '{{PROJECT_NUMBER}}': 'project.projectNumber',
  '{{PROJECT_NAME}}': 'project.projectName',
  '{{PROJECT_LOCATION}}': 'project.location',
  '{{PROPERTY_OWNER}}': 'project.propertyOwner',
  '{{PROJECT_START_DATE}}': 'project.startDate',
  '{{PROJECT_END_DATE}}': 'project.endDate',
  '{{SUBCONTRACT_NUMBER}}': 'contract.subcontractNumber',
  '{{SUBCONTRACT_NO}}': 'contract.subcontractNumber', // alternate name used in some templates
  '{{SUBCONTRACT_PRICE}}': 'contract.subcontractPriceFormatted',
  '{{AGREEMENT_DATE}}': 'contract.agreementDate',
  '{{PRIME_CONTRACT_OWNER}}': 'contract.primeContractOwner',
  '{{LIST_OF_EXHIBITS}}': 'contract.listOfExhibits',
  '{{ARBITRATION_LOCATION}}': 'contract.arbitrationLocation',
  '{{DEFAULT_CURE_HOURS}}': 'contract.defaultCureHours',
  '{{DELAY_NOTICE_DAYS}}': 'contract.delayNoticeDays',
  '{{GOVERNING_COUNTY_STATE}}': 'contract.governingCountyState',
  '{{GOVERNING_STATE}}': 'contract.governingState',
  '{{INSURANCE_CANCELLATION_NOTICE_DAYS}}': 'contract.insuranceCancellationNoticeDays',
  '{{INSURANCE_LIMIT_1M}}': 'contract.insuranceLimit1m',
  '{{INSURANCE_LIMIT_2M}}': 'contract.insuranceLimit2m',
  '{{LIEN_CURE_DAYS}}': 'contract.lienCureDays',
  '{{LIQUIDATED_DAMAGES_DAILY}}': 'contract.liquidatedDamagesDaily',
  '{{NOTICE_CURE_DAYS}}': 'contract.noticeCureDays',
  '{{PAYMENT_TERMS_DAYS}}': 'contract.paymentTermsDays',
  '{{RCG_LEGAL_NAME}}': 'rcg.legalName',
  '{{RCG_DISPLAY_NAME}}': 'rcg.displayName',
  '{{RCG_ADDRESS}}': 'rcg.address',
  '{{RCG_STREET_ADDRESS}}': 'rcg.streetAddress',
  '{{RCG_CITY_STATE_ZIP}}': 'rcg.cityStateZip',
  '{{RCG_PHONE}}': 'rcg.phone',
  '{{RCG_EMAIL}}': 'rcg.email',
  '{{RCG_WEBSITE}}': 'rcg.website',
  '{{RCG_SIGNATORY_NAME}}': 'rcg.signatoryName',
  '{{RCG_SIGNATORY_TITLE}}': 'rcg.signatoryTitle',
};

const CONTRACT_TEMPLATE_FILENAMES: Record<string, string> = {
  subcontractor_project_agreement: 'subcontractor-project-agreement-template.docx',
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce((cur: unknown, key) => (cur as Record<string, unknown>)?.[key], obj);
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
 * Merge placeholder text split across Word runs so {{PLACEHOLDER}} is contiguous.
 * Word often splits e.g. "{{SUBCONTRACT_NUMBER}}" into "<w:t>{{SUBCONTRACT_</w:t></w:r><w:r><w:t>NUMBER}}</w:t>".
 * This runs in a loop to handle 3+ run splits.
 */
function normalizePlaceholderRuns(xml: string): string {
  const runBoundary = /(\{\{[^}]*)<\/w:t>\s*<\/w:r>\s*<w:r[^>]*>\s*<w:t[^>]*>([^}]*\}\})/g;
  let prev = '';
  let result = xml;
  while (prev !== result) {
    prev = result;
    result = result.replace(runBoundary, '$1$2');
  }
  return result;
}

/** Build OOXML for list-of-exhibits so each line is a <w:t> run with <w:br/> between. */
function buildListOfExhibitsOoxml(displayValue: string): string {
  const lines = displayValue.split('\n').map((s) => escapeXml(s));
  if (lines.length === 0) {
    return '</w:t><w:t>N/A</w:t><w:t>';
  }
  const runs = lines
    .map((escaped, i) =>
      i === 0
        ? `<w:t>${escaped}</w:t>`
        : `<w:br/><w:t xml:space="preserve">${escaped}</w:t>`
    )
    .join('');
  return `</w:t>${runs}<w:t>`;
}

function replacePlaceholders(xml: string, fieldValues: Record<string, unknown>): string {
  let result = normalizePlaceholderRuns(xml);
  const replacements: Record<string, string> = {};
  for (const [placeholder, path] of Object.entries(PLACEHOLDERS)) {
    const value = getNestedValue(fieldValues, path);
    replacements[placeholder] = value || '[EMPTY]';
    const displayValue = value || 'N/A';
    const escaped =
      path === 'contract.listOfExhibits'
        ? buildListOfExhibitsOoxml(displayValue)
        : escapeXml(displayValue);
    const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
    result = result.replace(new RegExp(escapedPlaceholder, 'g'), escaped);
  }
  console.log('Placeholder replacements:', JSON.stringify(replacements, null, 2));
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as {
      projectId?: string;
      estimateId?: string;
      quoteId?: string;
      payeeId?: string;
      contractType?: string;
      fieldValues?: Record<string, unknown>;
      outputFormat?: 'docx' | 'pdf' | 'both';
      saveToDocuments?: boolean;
    };

    const {
      projectId,
      estimateId,
      quoteId,
      payeeId,
      contractType = 'subcontractor_project_agreement',
      fieldValues,
      outputFormat = 'docx',
      saveToDocuments = true,
    } = body;

    if (!projectId || !payeeId || !fieldValues) {
      throw new Error('Missing required fields: projectId, payeeId, fieldValues');
    }

    const primaryName = CONTRACT_TEMPLATE_FILENAMES[contractType] ?? 'subcontractor-project-agreement-template.docx';
    const fallbackNames = ['subcontractor-project-agreement-template.docx', 'subcontractor-agreement-template-FINAL.docx'];

    let templateData: Blob | ArrayBuffer | null = null;
    let templateError: { message: string } | null = null;
    for (const name of [primaryName, ...fallbackNames].filter((n, i, a) => a.indexOf(n) === i)) {
      const out = await supabase.storage.from('contract-templates').download(name);
      templateError = out.error as { message: string } | null;
      if (!out.error && out.data) {
        templateData = out.data as Blob;
        break;
      }
    }
    if (templateError || !templateData) {
      throw new Error(`Failed to fetch template. Tried: ${[...new Set([primaryName, ...fallbackNames])].join(', ')}. ${templateError?.message ?? 'No file found.'}`);
    }

    const zip = await new JSZip().loadAsync(await (templateData as Blob).arrayBuffer());

    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Invalid template: missing document.xml');
    }

    // Enrich fieldValues with computed/derived fields for template placeholders
    const enrichedFieldValues = JSON.parse(JSON.stringify(fieldValues)) as Record<string, unknown>;
    const sub = (enrichedFieldValues.subcontractor || {}) as Record<string, unknown>;
    const subAddr = String(sub.address ?? sub.addressFormatted ?? '').trim();
    
    // Parse address to split street from city/state/zip
    // Handles format: "6098 Executive Blvd Huber Heights OH 45424" -> street: "6098 Executive Blvd", cityStateZip: "Huber Heights, OH 45424"
    const parseAddress = (fullAddr: string): { street: string; cityStateZip: string } => {
      if (!fullAddr) return { street: '', cityStateZip: '' };

      const cleaned = fullAddr.replace(/\s+/g, ' ').trim();

      const stateZipMatch = cleaned.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
      if (!stateZipMatch) {
        return { street: cleaned, cityStateZip: cleaned };
      }

      const state = stateZipMatch[1];
      const zipCode = stateZipMatch[2];
      const beforeStateZip = cleaned.substring(0, stateZipMatch.index!).trim();

      const streetSuffixes = /\b(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Circle|Cir|Parkway|Pkwy|Place|Pl)\b/i;
      const suffixMatch = beforeStateZip.match(streetSuffixes);

      if (suffixMatch && suffixMatch.index !== undefined) {
        const endOfStreet = suffixMatch.index + suffixMatch[0].length;
        const street = beforeStateZip.substring(0, endOfStreet).trim();
        const city = beforeStateZip.substring(endOfStreet).trim();
        return {
          street,
          cityStateZip: city ? `${city}, ${state} ${zipCode}` : `${state} ${zipCode}`,
        };
      }

      const parts = beforeStateZip.split(/\s+/);
      if (parts.length >= 2) {
        const city = parts[parts.length - 1];
        const street = parts.slice(0, -1).join(' ');
        return {
          street,
          cityStateZip: `${city}, ${state} ${zipCode}`,
        };
      }

      return { street: cleaned, cityStateZip: `${state} ${zipCode}` };
    };
    
    const subParsed = parseAddress(subAddr);
    enrichedFieldValues.subcontractor = {
      ...sub,
      streetAddress: subParsed.street,
      cityStateZip: subParsed.cityStateZip,
      legalEntity: `[${String(sub.stateOfFormation ?? '').trim()}] [${String(sub.legalForm ?? '').trim()}]`,
    };
    
    const rcg = (enrichedFieldValues.rcg || {}) as Record<string, unknown>;
    const rcgAddr = String(rcg.address ?? '').trim();
    const rcgParsed = parseAddress(rcgAddr);
    enrichedFieldValues.rcg = {
      ...rcg,
      streetAddress: rcgParsed.street,
      cityStateZip: rcgParsed.cityStateZip,
    };

    zip.file('word/document.xml', replacePlaceholders(documentXml, enrichedFieldValues));

    const headerFiles = Object.keys(zip.files).filter((f) => /word\/header\d+\.xml/.test(f));
    const footerFiles = Object.keys(zip.files).filter((f) => /word\/footer\d+\.xml/.test(f));
    for (const f of headerFiles) {
      const content = await zip.file(f)?.async('string');
      if (content) zip.file(f, replacePlaceholders(content, enrichedFieldValues));
    }
    for (const f of footerFiles) {
      const content = await zip.file(f)?.async('string');
      if (content) zip.file(f, replacePlaceholders(content, enrichedFieldValues));
    }

    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const contractNumber = getNestedValue(fieldValues, 'contract.subcontractNumber');
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${contractNumber}_SubcontractorProjectAgreement_${timestamp}`;
    const docxPath = `contracts/${projectId}/${baseFilename}.docx`;

    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(docxPath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload DOCX: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from('project-documents').getPublicUrl(docxPath);
    const docxUrl = urlData.publicUrl;

    if (outputFormat === 'pdf' || outputFormat === 'both') {
      console.log('PDF generation not yet implemented - returning DOCX only');
    }

    const agreementDateShort = getNestedValue(fieldValues, 'contract.agreementDateShort');
    const subcontractPrice = Number(getNestedValue(fieldValues, 'contract.subcontractPrice')) || 0;
    const projectStart = getNestedValue(fieldValues, 'project.startDate') || null;
    const projectEnd = getNestedValue(fieldValues, 'project.endDate') || null;

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        project_id: projectId,
        estimate_id: estimateId || null,
        quote_id: quoteId || null,
        payee_id: payeeId,
        contract_number: contractNumber,
        contract_type: 'subcontractor_project_agreement',
        subcontract_price: subcontractPrice,
        agreement_date: agreementDateShort || timestamp,
        project_start_date: projectStart,
        project_end_date: projectEnd,
        field_values: fieldValues,
        docx_storage_path: docxPath,
        docx_url: docxUrl,
        pdf_storage_path: null,
        pdf_url: null,
        status: 'generated',
      })
      .select()
      .single();

    if (contractError) {
      throw new Error(`Failed to create contract record: ${contractError.message}`);
    }

    if (saveToDocuments) {
      const contractorName = getNestedValue(fieldValues, 'subcontractor.company');
      const { error: docErr } = await supabase.from('project_documents').insert({
        project_id: projectId,
        file_name: `${baseFilename}.docx`,
        file_url: docxUrl,
        file_size: (docxBuffer as ArrayBuffer).byteLength,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        document_type: 'contract',
        description: `Subcontractor Project Agreement - ${contractorName}`,
        related_quote_id: quoteId || null,
      });
      if (docErr) console.warn('Could not add to project_documents:', docErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contract.id,
        contractNumber: contract.contract_number,
        contractType: 'subcontractor_project_agreement',
        docxUrl,
        pdfUrl: null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contract generation error:', error);
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
