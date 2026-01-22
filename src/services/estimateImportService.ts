import { supabase } from '@/integrations/supabase/client';
import {
  Grid,
  ExtractionResult,
  ImportResult,
  EnrichedLineItem,
  ExtractedLineItem,
  ItemCategory,
} from '@/types/importTypes';
import { extractBudgetSheet } from '@/lib/budgetSheetParser';

// =============================================================================
// FILE PARSING
// =============================================================================

export async function parseUploadedFile(file: File): Promise<Grid> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return parseCSVFile(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelFile(file);
  }
  
  throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
}

async function parseCSVFile(file: File): Promise<Grid> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows: string[][] = [];
      
      for (const line of text.split(/\r?\n/)) {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim());
        rows.push(row);
      }
      
      const colCount = Math.max(...rows.map(r => r.length));
      resolve({ rows, rowCount: rows.length, colCount });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function parseExcelFile(file: File): Promise<Grid> {
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: '',
        });
        
        const colCount = Math.max(...rows.map(r => r.length));
        resolve({ rows, rowCount: rows.length, colCount });
      } catch {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// =============================================================================
// DETERMINISTIC CATEGORY ASSIGNMENT (No LLM needed)
// =============================================================================

function assignCategoryDeterministic(item: ExtractedLineItem): ItemCategory {
  const nameLower = item.name.toLowerCase();
  const vendorLower = (item.vendorName || '').toLowerCase();
  const isInternal = vendorLower === 'rcg' || vendorLower === '';

  // Management: internal + 0% markup OR contains management keywords
  if (isInternal && item.markupPct === 0) {
    return 'management';
  }
  if (nameLower.includes('supervision') || 
      nameLower.includes('management') || 
      nameLower.includes('pm') ||
      nameLower.includes('project manager')) {
    return 'management';
  }

  // By component type
  switch (item.component) {
    case 'labor':
      return 'labor_internal';
    case 'material':
      return 'materials';
    case 'sub':
      return 'subcontractors';
    default:
      return 'subcontractors';
  }
}

// =============================================================================
// MAIN IMPORT FUNCTION
// =============================================================================

export interface ImportOptions {
  useLLMEnrichment?: boolean;
  laborBillingRate?: number;
  laborActualRate?: number;
}

export async function importBudgetSheet(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const { useLLMEnrichment = false, laborBillingRate = 75, laborActualRate = 35 } = options;

  // Step 1: Parse file to grid
  const grid = await parseUploadedFile(file);

  // Step 2: Deterministic extraction
  const extraction = extractBudgetSheet(grid);

  if (!extraction.success) {
    return {
      success: false,
      items: [],
      warnings: extraction.warnings,
      metadata: {
        ...extraction.metadata,
        enrichmentUsed: false,
      },
    };
  }

  // Step 3: Category assignment (deterministic or LLM)
  let enrichedItems: EnrichedLineItem[];

  if (useLLMEnrichment) {
    // Optional: call edge function for LLM-assisted category/naming
    enrichedItems = await enrichWithLLM(extraction.items, laborBillingRate, laborActualRate);
  } else {
    // Deterministic assignment
    enrichedItems = extraction.items.map(item => ({
      ...item,
      category: assignCategoryDeterministic(item),
      normalizedName: item.name,
      categoryConfidence: 1.0, // Deterministic = full confidence
    }));
  }

  // Step 4: Apply labor rates for labor_internal items
  enrichedItems = enrichedItems.map(item => {
    if (item.category === 'labor_internal' && item.component === 'labor') {
      const laborHours = item.cost / laborBillingRate;
      return {
        ...item,
        laborHours,
        billingRatePerHour: laborBillingRate,
        actualCostRatePerHour: laborActualRate,
        laborCushionAmount: laborHours * (laborBillingRate - laborActualRate),
      } as EnrichedLineItem;
    }
    return item;
  });

  return {
    success: true,
    items: enrichedItems,
    warnings: extraction.warnings,
    metadata: {
      ...extraction.metadata,
      enrichmentUsed: useLLMEnrichment,
    },
  };
}

// =============================================================================
// OPTIONAL LLM ENRICHMENT
// =============================================================================

async function enrichWithLLM(
  items: ExtractedLineItem[],
  laborBillingRate: number,
  laborActualRate: number
): Promise<EnrichedLineItem[]> {
  try {
    const { data, error } = await supabase.functions.invoke('enrich-estimate-items', {
      body: {
        items: items.map(item => ({
          name: item.name,
          component: item.component,
          vendorName: item.vendorName,
          cost: item.cost,
          markupPct: item.markupPct,
        })),
        laborBillingRate,
        laborActualRate,
      },
    });

    if (error || !data?.items) {
      console.warn('[enrichWithLLM] Failed, falling back to deterministic:', error);
      return items.map(item => ({
        ...item,
        category: assignCategoryDeterministic(item),
        normalizedName: item.name,
        categoryConfidence: 1.0,
      }));
    }

    // Merge LLM results with extracted items
    return items.map((item, i) => ({
      ...item,
      category: data.items[i]?.category || assignCategoryDeterministic(item),
      normalizedName: data.items[i]?.normalizedName || item.name,
      categoryConfidence: data.items[i]?.confidence || 1.0,
    }));
  } catch (err) {
    console.warn('[enrichWithLLM] Error, falling back to deterministic:', err);
    return items.map(item => ({
      ...item,
      category: assignCategoryDeterministic(item),
      normalizedName: item.name,
      categoryConfidence: 1.0,
    }));
  }
}

// =============================================================================
// CONVERT TO ESTIMATE LINE ITEMS
// =============================================================================

export function convertToEstimateLineItems(items: EnrichedLineItem[]): any[] {
  return items.map((item, i) => {
    // Determine if this is an hourly labor item
    const isHourlyLabor = item.component === 'labor' && 'laborHours' in item && (item as any).laborHours > 0;
    
    const quantity = isHourlyLabor ? (item as any).laborHours : 1;
    const unit = isHourlyLabor ? 'HR' : 'LS';
    // For labor items, use billing rate (not actual cost) so the cushion is baked into the cost structure
    const costPerUnit = isHourlyLabor && (item as any).billingRatePerHour 
      ? (item as any).billingRatePerHour
      : (quantity > 0 ? item.cost / quantity : item.cost);
    const pricePerUnit = quantity > 0 ? (item.price || item.cost) / quantity : (item.price || item.cost);
    
    const totalCost = quantity * costPerUnit;
    const total = quantity * pricePerUnit;
    const totalMarkup = total - totalCost;
    
    return {
      id: `imported-${Date.now()}-${i}`,
      description: item.normalizedName || item.name,
      category: item.category === 'subcontractors' ? 'subcontractors' : item.category,
      quantity,
      unit,
      costPerUnit,
      pricePerUnit,
      markupPercent: item.markupPct !== null ? item.markupPct * 100 : 0,
      markupAmount: null,
      total,
      totalCost,
      totalMarkup,
      laborHours: isHourlyLabor ? (item as any).laborHours : null,
      billingRatePerHour: isHourlyLabor ? (item as any).billingRatePerHour : null,
      actualCostRatePerHour: isHourlyLabor ? (item as any).actualCostRatePerHour : null,
      laborCushionAmount: isHourlyLabor ? (item as any).laborCushionAmount : null,
      notes: item.wasSplit ? `Split from: ${item.splitFromName}` : undefined,
      vendorId: null,
      subcontractorId: null,
      phaseId: null,
    };
  });
}
