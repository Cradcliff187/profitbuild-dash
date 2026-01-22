// Type definitions for deterministic budget sheet import

// =============================================================================
// GRID & PARSING TYPES
// =============================================================================

export type Grid = {
  rows: string[][];
  rowCount: number;
  colCount: number;
};

export type CostComponent = 'labor' | 'material' | 'sub';

// =============================================================================
// COLUMN MAPPING
// =============================================================================

export interface BudgetColumns {
  itemCol: number;
  subcontractorCol: number | null;
  laborCol: number | null;
  materialCol: number | null;
  subCol: number | null;
  totalCol: number | null;
  markupCol: number | null;
  totalWithMarkupCol: number | null;
}

export interface ColumnMappingResult {
  columns: BudgetColumns;
  headerRowIndex: number;
  confidence: number;  // 0-1
  unmappedHeaders: string[];
  warnings: ImportWarning[];
}

// =============================================================================
// EXTRACTED LINE ITEMS (Deterministic Truth)
// =============================================================================

export interface ExtractedLineItem {
  sourceRowIndex: number;
  sourceItemNameRaw: string;
  name: string;
  component: CostComponent;
  vendorName: string | null;
  cost: number;
  markupPct: number | null;
  price: number | null;
  wasSplit: boolean;
  splitFromName: string | null;
  raw: {
    subcontractorCell: string | null;
    laborCell: string | null;
    materialCell: string | null;
    subCell: string | null;
    markupCell: string | null;
    totalWithMarkupCell: string | null;
  };
}

// =============================================================================
// ENRICHED LINE ITEMS (After optional LLM pass)
// =============================================================================

export type ItemCategory = 'labor_internal' | 'materials' | 'subcontractors' | 'management';

export interface EnrichedLineItem extends ExtractedLineItem {
  category: ItemCategory;
  normalizedName: string;
  categoryConfidence: number;
}

// =============================================================================
// WARNINGS
// =============================================================================

export type WarningCode =
  | 'HEADER_NOT_FOUND'
  | 'COLUMN_MISSING'
  | 'COLUMN_AMBIGUOUS'
  | 'STOP_MARKER_FOUND'
  | 'STOP_BY_STRUCTURE'
  | 'SKIPPED_SUMMARY_ROW'
  | 'SKIPPED_EMPTY_ROW'
  | 'MARKUP_MISSING'
  | 'TOTAL_MISMATCH'
  | 'UNPARSEABLE_CURRENCY'
  | 'UNPARSEABLE_PERCENT'
  | 'LOW_CONFIDENCE_MAPPING'
  | 'NEGATIVE_VALUE';

export interface ImportWarning {
  code: WarningCode;
  message: string;
  rowIndex?: number;
  details?: Record<string, unknown>;
}

// =============================================================================
// EXTRACTION RESULT
// =============================================================================

export interface ExtractionResult {
  success: boolean;
  items: ExtractedLineItem[];
  warnings: ImportWarning[];
  metadata: {
    headerRowIndex: number;
    stopRowIndex: number | null;
    stopReason: string | null;
    rowsScanned: number;
    rowsExtracted: number;
    compoundRowsSplit: number;
    mappingConfidence: number;
    computedTotals: {
      totalCost: number;
      totalPrice: number;
    };
  };
}

// =============================================================================
// FINAL IMPORT RESULT
// =============================================================================

export interface ImportResult {
  success: boolean;
  items: EnrichedLineItem[];
  warnings: ImportWarning[];
  metadata: ExtractionResult['metadata'] & {
    enrichmentUsed: boolean;
  };
}


// =============================================================================
// UI STATE & DISPLAY
// =============================================================================

export type ImportStep = 'upload' | 'mapping' | 'processing' | 'review';

export interface ImportState {
  step: ImportStep;
  file: File | null;
  grid: Grid | null;
  columnMapping: ColumnMappingResult | null;
  extractionResult: ExtractionResult | null;
  finalResult: ImportResult | null;
  selectedIndices: Set<number>;
  error: string | null;
}

export const IMPORT_CATEGORY_DISPLAY: Record<ItemCategory, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  labor_internal: { label: 'Labor (Internal)', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  subcontractors: { label: 'Subcontractor', color: 'text-green-700', bgColor: 'bg-green-50' },
  materials: { label: 'Materials', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  management: { label: 'Management', color: 'text-purple-700', bgColor: 'bg-purple-50' }
};

export function calculateImportedItemCushion(item: EnrichedLineItem): number {
  if (item.category !== 'labor_internal') return 0;
  const laborHours = item.component === 'labor' ? item.cost / 75 : 0; // Default billing rate
  const billingRate = 75;
  const actualRate = 35;
  return laborHours * (billingRate - actualRate);
}

// =============================================================================
// SUMMARY (For UI display)
// =============================================================================

export interface ImportSummary {
  totalLineItems: number;
  totalCost: number;
  totalPrice: number;
  laborItemsCount: number;
  subcontractorItemsCount: number;
  materialsItemsCount: number;
  managementItemsCount: number;
  totalLaborHours: number;
  estimatedLaborCushion: number;
}
