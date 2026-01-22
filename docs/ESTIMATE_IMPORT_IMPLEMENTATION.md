# AI Estimate Import — Production Implementation

## Design Principle

> **The system is deterministic for what gets imported and the dollars.**
> **The LLM is optional and only assists with classification/naming cleanup—never arithmetic or "where to stop".**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE A: DETERMINISTIC EXTRACTION            │
│                    (Frontend Service - REQUIRED)                │
├─────────────────────────────────────────────────────────────────┤
│  1. Parse file → Grid                                           │
│  2. Find header row (scoring algorithm)                         │
│  3. Map columns (fuzzy + synonyms)                              │
│  4. Detect table region (stop markers + structural)             │
│  5. Extract line rows + split compounds                         │
│  6. Validate totals                                             │
│  Output: ExtractedLineItem[] + warnings                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE B: LLM ENRICHMENT                      │
│                    (Edge Function - OPTIONAL)                   │
├─────────────────────────────────────────────────────────────────┤
│  Input: ExtractedLineItem[] (dollars already correct)           │
│  Output: category classification + cleaned names + confidence   │
│  NO arithmetic, NO boundary decisions                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── types/
│   └── importTypes.ts           # All type definitions
├── services/
│   └── estimateImportService.ts # Main service (Stage A + B)
├── lib/
│   └── budgetSheetParser.ts     # Deterministic extraction logic
├── components/
│   └── estimates/
│       ├── ImportEstimateModal.tsx
│       └── ColumnMappingModal.tsx  # For uncertain files
supabase/
└── functions/
    └── enrich-estimate-items/
        └── index.ts             # Optional LLM enrichment
```

---

## Types: `src/types/importTypes.ts`

```typescript
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
// UI STATE
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
```

---

## Parser: `src/lib/budgetSheetParser.ts`

```typescript
import {
  Grid,
  BudgetColumns,
  ColumnMappingResult,
  ExtractedLineItem,
  ExtractionResult,
  ImportWarning,
  CostComponent,
} from '@/types/importTypes';

// =============================================================================
// CONSTANTS
// =============================================================================

const INTERNAL_VENDOR = 'RCG';

// Header synonyms for fuzzy matching
const HEADER_SYNONYMS: Record<string, string[]> = {
  item: ['item', 'items', 'scope', 'description', 'desc', 'line item', 'task', 'work item'],
  subcontractor: ['subcontractor', 'sub contractor', 'vendor', 'trade', 'company', 'contractor'],
  labor: ['labor', 'labour', 'labor cost', 'labor $', 'labor amt', 'labor amount', 'labor total'],
  material: ['material', 'materials', 'mat', 'material cost', 'material $', 'mat cost'],
  sub: ['sub', 'subs', 'sub cost', 'sub $', 'sub amount', 'subcontract', 'subcontract cost', 'sub total'],
  markup: ['markup', 'mark up', 'mu', 'margin %', 'markup %', 'mark-up'],
  total: ['total', 'cost total', 'total cost', 'ext', 'extended'],
  totalWithMarkup: ['total with mark up', 'total w markup', 'total w/ mark up', 'sell', 'price', 'sell price', 'total price'],
  profit: ['profit', 'margin $', 'gross profit', 'gp'],
};

// Stop markers - if any cell contains these, stop scanning
const STOP_MARKERS = [
  'expenses',
  'expense tracking',
  'expense log',
  'rcg labor',
  'labor tracking',
  'timecard',
  'payroll',
  'subcontractor expenses',
  'sub expenses',
  'reconciliation',
  'total cost',
  'total contract',
  'total job proposal',
  'construction contract',
  'terms and conditions',
  'signature',
  'hereby',
  'contingency',
];

// Summary row indicators - skip these rows
const SUMMARY_INDICATORS = ['total', 'subtotal', 'summary', 'grand total'];

// =============================================================================
// UTILITIES
// =============================================================================

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[:\-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseCurrency(value: string): number | null {
  if (!value || typeof value !== 'string') return null;
  
  // Remove currency symbols, spaces, and handle parentheses for negatives
  let cleaned = value.trim();
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  cleaned = cleaned.replace(/[$,\s()]/g, '');
  
  if (cleaned === '' || cleaned === '-') return 0;
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  
  return isNegative ? Math.abs(num) : Math.abs(num); // Always positive for costs
}

function parsePercent(value: string): number | null {
  if (!value || typeof value !== 'string') return null;
  
  let cleaned = value.trim().replace('%', '').replace(/\s/g, '');
  if (cleaned === '') return null;
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  
  // Normalize: if > 1, assume it's a percentage (25 -> 0.25)
  return num > 1 ? num / 100 : num;
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

// Simple Levenshtein distance for typo tolerance
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// =============================================================================
// A1: FIND HEADER ROW (Scoring Algorithm)
// =============================================================================

interface HeaderRowCandidate {
  rowIndex: number;
  score: number;
  matchedHeaders: string[];
}

export function findHeaderRow(grid: Grid, maxRowsToScan = 60): HeaderRowCandidate | null {
  const candidates: HeaderRowCandidate[] = [];

  for (let i = 0; i < Math.min(grid.rowCount, maxRowsToScan); i++) {
    const row = grid.rows[i];
    let score = 0;
    const matchedHeaders: string[] = [];

    for (const cell of row) {
      const normalized = normalize(cell);
      if (!normalized) continue;

      // Check against synonyms
      for (const [canonical, synonyms] of Object.entries(HEADER_SYNONYMS)) {
        for (const synonym of synonyms) {
          if (normalized === synonym || normalized.includes(synonym)) {
            // Weight different header types
            if (canonical === 'item') score += 5;
            else if (['labor', 'material', 'sub', 'markup', 'total'].includes(canonical)) score += 3;
            else if (canonical === 'subcontractor') score += 2;
            else score += 1;
            
            matchedHeaders.push(canonical);
            break;
          }
          // Typo tolerance: allow edit distance <= 2 for longer words
          if (synonym.length >= 5 && levenshtein(normalized, synonym) <= 2) {
            score += 2;
            matchedHeaders.push(canonical + '(fuzzy)');
            break;
          }
        }
      }
    }

    // Penalize rows that look like data (lots of currency values)
    const currencyCount = row.filter(c => parseCurrency(c) !== null && parseCurrency(c)! > 0).length;
    if (currencyCount > 3) score -= 3;

    if (score >= 8) { // Minimum threshold
      candidates.push({ rowIndex: i, score, matchedHeaders });
    }
  }

  if (candidates.length === 0) return null;

  // Return highest scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

// =============================================================================
// A2: MAP COLUMNS (Fuzzy + Synonyms)
// =============================================================================

export function mapColumns(grid: Grid, headerRowIndex: number): ColumnMappingResult {
  const headerRow = grid.rows[headerRowIndex];
  const warnings: ImportWarning[] = [];
  const unmappedHeaders: string[] = [];

  const columns: BudgetColumns = {
    itemCol: -1,
    subcontractorCol: null,
    laborCol: null,
    materialCol: null,
    subCol: null,
    totalCol: null,
    markupCol: null,
    totalWithMarkupCol: null,
  };

  const mappedIndices = new Set<number>();

  // Map each header cell to canonical column
  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    const cell = headerRow[colIdx];
    const normalized = normalize(cell);
    if (!normalized) continue;

    let bestMatch: { canonical: string; confidence: number } | null = null;

    for (const [canonical, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      for (const synonym of synonyms) {
        // Exact match
        if (normalized === synonym) {
          bestMatch = { canonical, confidence: 1.0 };
          break;
        }
        // Contains match
        if (normalized.includes(synonym) || synonym.includes(normalized)) {
          const conf = Math.min(normalized.length, synonym.length) / Math.max(normalized.length, synonym.length);
          if (!bestMatch || conf > bestMatch.confidence) {
            bestMatch = { canonical, confidence: conf * 0.9 };
          }
        }
        // Fuzzy match for typos
        if (synonym.length >= 5) {
          const dist = levenshtein(normalized, synonym);
          if (dist <= 2) {
            const conf = 1 - (dist / synonym.length);
            if (!bestMatch || conf > bestMatch.confidence) {
              bestMatch = { canonical, confidence: conf * 0.8 };
            }
          }
        }
      }
      if (bestMatch?.confidence === 1.0) break;
    }

    if (bestMatch && bestMatch.confidence >= 0.6) {
      const key = bestMatch.canonical + 'Col';
      if (key in columns && !mappedIndices.has(colIdx)) {
        (columns as any)[key] = colIdx;
        mappedIndices.add(colIdx);
      }
    } else if (normalized) {
      unmappedHeaders.push(cell);
    }
  }

  // Validate required columns
  if (columns.itemCol === -1) {
    warnings.push({ code: 'COLUMN_MISSING', message: 'Item column not found' });
  }

  const hasCostColumn = columns.laborCol !== null || columns.materialCol !== null || columns.subCol !== null;
  if (!hasCostColumn) {
    warnings.push({ code: 'COLUMN_MISSING', message: 'No cost columns (Labor/Material/Sub) found' });
  }

  // Calculate confidence
  let confidence = 1.0;
  if (columns.itemCol === -1) confidence -= 0.4;
  if (!hasCostColumn) confidence -= 0.4;
  if (columns.markupCol === null) confidence -= 0.1;
  if (unmappedHeaders.length > 3) confidence -= 0.1;

  return {
    columns,
    headerRowIndex,
    confidence: Math.max(0, confidence),
    unmappedHeaders,
    warnings,
  };
}

// =============================================================================
// A3: DETECT TABLE REGION (Stop Markers + Structural)
// =============================================================================

interface TableRegion {
  startRow: number;
  endRow: number;
  stopReason: string | null;
  warnings: ImportWarning[];
}

export function detectTableRegion(
  grid: Grid,
  headerRowIndex: number,
  columns: BudgetColumns
): TableRegion {
  const warnings: ImportWarning[] = [];
  const startRow = headerRowIndex + 1;
  let endRow = grid.rowCount;
  let stopReason: string | null = null;
  let consecutiveEmptyRows = 0;

  for (let i = startRow; i < grid.rowCount; i++) {
    const row = grid.rows[i];
    const rowText = row.join(' ').toLowerCase();

    // Check stop markers
    for (const marker of STOP_MARKERS) {
      if (rowText.includes(marker)) {
        endRow = i;
        stopReason = `Stop marker found: "${marker}"`;
        warnings.push({
          code: 'STOP_MARKER_FOUND',
          message: stopReason,
          rowIndex: i,
        });
        return { startRow, endRow, stopReason, warnings };
      }
    }

    // Check for empty/zero row pattern
    const itemCell = columns.itemCol >= 0 ? row[columns.itemCol] : '';
    const laborVal = columns.laborCol !== null ? parseCurrency(row[columns.laborCol]) : 0;
    const materialVal = columns.materialCol !== null ? parseCurrency(row[columns.materialCol]) : 0;
    const subVal = columns.subCol !== null ? parseCurrency(row[columns.subCol]) : 0;

    const isEmptyRow = !itemCell?.trim() && 
      (laborVal === 0 || laborVal === null) && 
      (materialVal === 0 || materialVal === null) && 
      (subVal === 0 || subVal === null);

    if (isEmptyRow) {
      consecutiveEmptyRows++;
      if (consecutiveEmptyRows >= 3) {
        endRow = i - 2;
        stopReason = 'Stopped after 3 consecutive empty rows';
        warnings.push({
          code: 'STOP_BY_STRUCTURE',
          message: stopReason,
          rowIndex: i,
        });
        return { startRow, endRow, stopReason, warnings };
      }
    } else {
      consecutiveEmptyRows = 0;
    }
  }

  return { startRow, endRow, stopReason, warnings };
}

// =============================================================================
// A4-A6: EXTRACT LINE ITEMS + SPLIT COMPOUNDS
// =============================================================================

export function extractLineItems(
  grid: Grid,
  columns: BudgetColumns,
  startRow: number,
  endRow: number
): { items: ExtractedLineItem[]; warnings: ImportWarning[]; compoundRowsSplit: number } {
  const items: ExtractedLineItem[] = [];
  const warnings: ImportWarning[] = [];
  let compoundRowsSplit = 0;

  for (let i = startRow; i < endRow; i++) {
    const row = grid.rows[i];
    
    // Get item name
    const itemCell = columns.itemCol >= 0 ? (row[columns.itemCol] || '').trim() : '';
    
    // Skip empty item rows
    if (!itemCell) {
      continue;
    }

    // Skip summary rows
    const itemLower = itemCell.toLowerCase();
    if (SUMMARY_INDICATORS.some(ind => itemLower.includes(ind))) {
      warnings.push({
        code: 'SKIPPED_SUMMARY_ROW',
        message: `Skipped summary row: "${itemCell}"`,
        rowIndex: i,
      });
      continue;
    }

    // Parse values
    const subcontractorCell = columns.subcontractorCol !== null ? row[columns.subcontractorCol] : null;
    const laborCell = columns.laborCol !== null ? row[columns.laborCol] : null;
    const materialCell = columns.materialCol !== null ? row[columns.materialCol] : null;
    const subCell = columns.subCol !== null ? row[columns.subCol] : null;
    const markupCell = columns.markupCol !== null ? row[columns.markupCol] : null;
    const totalWithMarkupCell = columns.totalWithMarkupCol !== null ? row[columns.totalWithMarkupCol] : null;

    const laborCost = parseCurrency(laborCell || '') || 0;
    const materialCost = parseCurrency(materialCell || '') || 0;
    const subCost = parseCurrency(subCell || '') || 0;
    const markupPct = parsePercent(markupCell || '');

    // Skip if all costs are zero
    if (laborCost === 0 && materialCost === 0 && subCost === 0) {
      warnings.push({
        code: 'SKIPPED_EMPTY_ROW',
        message: `Skipped row with no costs: "${itemCell}"`,
        rowIndex: i,
      });
      continue;
    }

    // Warn if markup missing
    if (markupPct === null) {
      warnings.push({
        code: 'MARKUP_MISSING',
        message: `Markup missing for "${itemCell}"`,
        rowIndex: i,
      });
    }

    // Determine which components are non-zero
    const components: { type: CostComponent; cost: number }[] = [];
    if (laborCost > 0.005) components.push({ type: 'labor', cost: laborCost });
    if (materialCost > 0.005) components.push({ type: 'material', cost: materialCost });
    if (subCost > 0.005) components.push({ type: 'sub', cost: subCost });

    const needsSplit = components.length > 1;
    if (needsSplit) compoundRowsSplit++;

    // Create line items
    const rawValues = {
      subcontractorCell: subcontractorCell?.trim() || null,
      laborCell: laborCell?.trim() || null,
      materialCell: materialCell?.trim() || null,
      subCell: subCell?.trim() || null,
      markupCell: markupCell?.trim() || null,
      totalWithMarkupCell: totalWithMarkupCell?.trim() || null,
    };

    for (const comp of components) {
      const baseName = itemCell;
      
      // Naming rules (deterministic)
      let name: string;
      if (comp.type === 'labor') {
        name = baseName;
      } else if (comp.type === 'material') {
        name = needsSplit ? `${baseName} - Materials` : baseName;
      } else {
        name = baseName;
      }

      // Vendor assignment rules (deterministic)
      let vendorName: string | null;
      if (comp.type === 'sub') {
        vendorName = subcontractorCell?.trim() || null;
      } else {
        // Labor and Material components - check if subcontractor is RCG or internal
        const subContractor = (subcontractorCell || '').trim().toUpperCase();
        vendorName = subContractor === INTERNAL_VENDOR || subContractor === '' ? INTERNAL_VENDOR : subContractor;
      }

      // Price calculation
      const price = markupPct !== null ? round2(comp.cost * (1 + markupPct)) : null;

      items.push({
        sourceRowIndex: i + 1, // 1-indexed for user display
        sourceItemNameRaw: itemCell,
        name,
        component: comp.type,
        vendorName,
        cost: round2(comp.cost),
        markupPct,
        price,
        wasSplit: needsSplit,
        splitFromName: needsSplit ? itemCell : null,
        raw: rawValues,
      });
    }
  }

  return { items, warnings, compoundRowsSplit };
}

// =============================================================================
// A7: VALIDATE TOTALS
// =============================================================================

export function validateTotals(
  items: ExtractedLineItem[],
  grid: Grid,
  columns: BudgetColumns
): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  const computedTotalCost = items.reduce((sum, item) => sum + item.cost, 0);
  const computedTotalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);

  // TODO: If sheet has summary row with totals, compare against computed
  // This would require finding the summary row and parsing its values

  // Basic sanity check
  if (computedTotalPrice < computedTotalCost * 0.9 && computedTotalPrice > 0) {
    warnings.push({
      code: 'TOTAL_MISMATCH',
      message: `Total price ($${computedTotalPrice.toFixed(2)}) is less than total cost ($${computedTotalCost.toFixed(2)})`,
      details: { computedTotalCost, computedTotalPrice },
    });
  }

  return warnings;
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

export function extractBudgetSheet(grid: Grid): ExtractionResult {
  const allWarnings: ImportWarning[] = [];

  // Step 1: Find header row
  const headerCandidate = findHeaderRow(grid);
  if (!headerCandidate) {
    return {
      success: false,
      items: [],
      warnings: [{ code: 'HEADER_NOT_FOUND', message: 'Could not detect header row' }],
      metadata: {
        headerRowIndex: -1,
        stopRowIndex: null,
        stopReason: 'Header not found',
        rowsScanned: 0,
        rowsExtracted: 0,
        compoundRowsSplit: 0,
        mappingConfidence: 0,
        computedTotals: { totalCost: 0, totalPrice: 0 },
      },
    };
  }

  // Step 2: Map columns
  const mapping = mapColumns(grid, headerCandidate.rowIndex);
  allWarnings.push(...mapping.warnings);

  if (mapping.columns.itemCol === -1) {
    return {
      success: false,
      items: [],
      warnings: allWarnings,
      metadata: {
        headerRowIndex: headerCandidate.rowIndex,
        stopRowIndex: null,
        stopReason: 'Required columns missing',
        rowsScanned: 0,
        rowsExtracted: 0,
        compoundRowsSplit: 0,
        mappingConfidence: mapping.confidence,
        computedTotals: { totalCost: 0, totalPrice: 0 },
      },
    };
  }

  // Step 3: Detect table region
  const region = detectTableRegion(grid, headerCandidate.rowIndex, mapping.columns);
  allWarnings.push(...region.warnings);

  // Step 4: Extract line items
  const extraction = extractLineItems(grid, mapping.columns, region.startRow, region.endRow);
  allWarnings.push(...extraction.warnings);

  // Step 5: Validate totals
  const totalWarnings = validateTotals(extraction.items, grid, mapping.columns);
  allWarnings.push(...totalWarnings);

  const totalCost = extraction.items.reduce((sum, item) => sum + item.cost, 0);
  const totalPrice = extraction.items.reduce((sum, item) => sum + (item.price || 0), 0);

  return {
    success: extraction.items.length > 0,
    items: extraction.items,
    warnings: allWarnings,
    metadata: {
      headerRowIndex: headerCandidate.rowIndex,
      stopRowIndex: region.endRow,
      stopReason: region.stopReason,
      rowsScanned: region.endRow - region.startRow,
      rowsExtracted: extraction.items.length,
      compoundRowsSplit: extraction.compoundRowsSplit,
      mappingConfidence: mapping.confidence,
      computedTotals: { totalCost: round2(totalCost), totalPrice: round2(totalPrice) },
    },
  };
}
```

---

## Service: `src/services/estimateImportService.ts`

```typescript
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
  console.log('[importBudgetSheet] Parsed grid:', grid.rowCount, 'rows');

  // Step 2: Deterministic extraction
  const extraction = extractBudgetSheet(grid);
  console.log('[importBudgetSheet] Extraction result:', {
    items: extraction.items.length,
    warnings: extraction.warnings.length,
    confidence: extraction.metadata.mappingConfidence,
  });

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
      };
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
  return items.map((item, i) => ({
    id: `imported-${Date.now()}-${i}`,
    description: item.normalizedName,
    category: item.category === 'subcontractors' ? 'subcontractors' : item.category,
    quantity: item.component === 'labor' && (item as any).laborHours 
      ? (item as any).laborHours 
      : 1,
    unit: item.component === 'labor' ? 'HR' : 'LS',
    costPerUnit: item.component === 'labor' && (item as any).billingRatePerHour
      ? (item as any).billingRatePerHour
      : item.cost,
    pricePerUnit: item.price || item.cost,
    markupPercent: item.markupPct !== null ? item.markupPct * 100 : 0,
    markupAmount: null,
    total: item.price || item.cost,
    laborHours: (item as any).laborHours || null,
    billingRatePerHour: (item as any).billingRatePerHour || null,
    actualCostRatePerHour: (item as any).actualCostRatePerHour || null,
    laborCushionAmount: (item as any).laborCushionAmount || null,
    notes: item.wasSplit ? `Split from: ${item.splitFromName}` : undefined,
    vendorId: null,
    subcontractorId: null,
    phaseId: null,
  }));
}
```

---

## Edge Function (Optional): `supabase/functions/enrich-estimate-items/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, laborBillingRate, laborActualRate } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build focused prompt - NO arithmetic, NO boundary decisions
    const systemPrompt = `You are a construction estimate classifier. You will receive line items that have ALREADY been extracted and split. Your ONLY job is to:
1. Classify each item's category
2. Optionally clean up the name

Categories:
- management: Project management, supervision, PM, general conditions with 0% markup
- labor_internal: Internal labor work done by RCG
- materials: Material costs
- subcontractors: Work done by external subcontractors

IMPORTANT:
- Do NOT change any dollar amounts
- Do NOT add or remove items
- Do NOT make boundary decisions
- ONLY classify and optionally clean names

Return JSON array with same length as input.`;

    const userPrompt = `Classify these ${items.length} items:
${items.map((item: any, i: number) => `${i + 1}. "${item.name}" | component: ${item.component} | vendor: ${item.vendorName || 'none'} | cost: $${item.cost}`).join('\n')}

Return JSON:
{
  "items": [
    { "category": "...", "normalizedName": "...", "confidence": 0.0-1.0 }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[enrich-estimate-items] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Modal Component: `src/components/estimates/ImportEstimateModal.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  parseUploadedFile,
  importBudgetSheet,
  convertToEstimateLineItems,
} from '@/services/estimateImportService';
import { ImportResult, EnrichedLineItem, ImportStep } from '@/types/importTypes';
import { useInternalLaborRates } from '@/hooks/useCompanySettings';

interface ImportEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: any[]) => void;
}

const CATEGORY_DISPLAY = {
  labor_internal: { label: 'Labor', color: 'text-blue-700', bg: 'bg-blue-50' },
  materials: { label: 'Materials', color: 'text-orange-700', bg: 'bg-orange-50' },
  subcontractors: { label: 'Subcontractor', color: 'text-green-700', bg: 'bg-green-50' },
  management: { label: 'Management', color: 'text-purple-700', bg: 'bg-purple-50' },
};

export function ImportEstimateModal({
  isOpen,
  onClose,
  onImport,
}: ImportEstimateModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: laborRates } = useInternalLaborRates();
  const laborBillingRate = laborRates?.billing_rate_per_hour ?? 75;
  const laborActualRate = laborRates?.actual_cost_per_hour ?? 35;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setError(null);
    setIsLoading(true);
    setStep('processing');

    try {
      const importResult = await importBudgetSheet(uploadedFile, {
        useLLMEnrichment: false, // Deterministic by default
        laborBillingRate,
        laborActualRate,
      });

      if (!importResult.success) {
        throw new Error(importResult.warnings[0]?.message || 'Failed to parse file');
      }

      setResult(importResult);
      setSelectedIndices(new Set(importResult.items.map((_, i) => i)));
      setStep('review');

      toast.success(`Found ${importResult.items.length} line items`, {
        description: `${importResult.metadata.compoundRowsSplit} compound rows split`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setStep('upload');
      toast.error('Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [laborBillingRate, laborActualRate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  const toggleItem = (i: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    setSelectedIndices(prev =>
      prev.size === result.items.length
        ? new Set()
        : new Set(result.items.map((_, i) => i))
    );
  };

  const handleImport = () => {
    if (!result) return;
    const items = result.items.filter((_, i) => selectedIndices.has(i));
    const converted = convertToEstimateLineItems(items);
    onImport(converted);
    toast.success(`Imported ${items.length} line items`);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setResult(null);
    setSelectedIndices(new Set());
    setError(null);
    onClose();
  };

  // Calculate selected totals
  const selectedItems = result?.items.filter((_, i) => selectedIndices.has(i)) || [];
  const totalCost = selectedItems.reduce((sum, item) => sum + item.cost, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Budget Sheet
          </DialogTitle>
          <DialogDescription>
            Upload a budget sheet to automatically extract line items
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Supports .csv, .xlsx, .xls
              </p>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">Processing budget sheet...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Detecting headers, extracting items, splitting compounds
              </p>
              <Progress value={66} className="w-64 mx-auto mt-6" />
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && result && (
            <div className="space-y-4">
              {/* Metadata banner */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex flex-wrap gap-4">
                  <span>Header: Row {result.metadata.headerRowIndex + 1}</span>
                  <span>Scanned: {result.metadata.rowsScanned} rows</span>
                  <span>Extracted: {result.metadata.rowsExtracted} items</span>
                  {result.metadata.compoundRowsSplit > 0 && (
                    <span className="text-amber-600">
                      {result.metadata.compoundRowsSplit} compound rows split
                    </span>
                  )}
                  {result.metadata.stopReason && (
                    <span className="text-muted-foreground">
                      Stop: {result.metadata.stopReason}
                    </span>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.filter(w => w.code !== 'SKIPPED_EMPTY_ROW').length > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>{result.warnings.length} warnings:</strong>
                    <ul className="list-disc list-inside mt-1 text-sm max-h-20 overflow-auto">
                      {result.warnings
                        .filter(w => w.code !== 'SKIPPED_EMPTY_ROW')
                        .slice(0, 5)
                        .map((w, i) => (
                          <li key={i}>{w.message}</li>
                        ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Selection header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIndices.size === result.items.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="font-medium">
                    {selectedIndices.size} of {result.items.length} selected
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{file?.name}</span>
              </div>

              {/* Items table */}
              <div className="border rounded-lg overflow-hidden max-h-[45vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Markup</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((item, i) => {
                      const cat = CATEGORY_DISPLAY[item.category];
                      return (
                        <TableRow
                          key={i}
                          className={`cursor-pointer ${!selectedIndices.has(i) ? 'opacity-40' : ''}`}
                          onClick={() => toggleItem(i)}
                        >
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIndices.has(i)}
                              onCheckedChange={() => toggleItem(i)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.normalizedName}</span>
                              {item.wasSplit && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Split
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${cat.bg} ${cat.color} border-0`}>
                              {cat.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.vendorName || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.markupPct !== null ? `${(item.markupPct * 100).toFixed(0)}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {item.price !== null ? formatCurrency(item.price) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 border rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Cost</div>
                  <div className="font-mono font-semibold text-lg">
                    {formatCurrency(totalCost)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Price</div>
                  <div className="font-mono font-semibold text-lg">
                    {formatCurrency(totalPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gross Margin</div>
                  <div className="font-mono font-semibold text-lg">
                    {totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 'review' ? () => { setStep('upload'); setFile(null); setResult(null); } : handleClose}
            disabled={isLoading}
          >
            {step === 'review' ? (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            ) : (
              'Cancel'
            )}
          </Button>
          {step === 'review' && (
            <Button onClick={handleImport} disabled={!selectedIndices.size}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Import {selectedIndices.size} Items
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImportEstimateModal;
```

---

## Integration: Add to EstimateForm.tsx

Find the appropriate locations by context (not line numbers):

**Add imports:**
```typescript
import { ImportEstimateModal } from '@/components/estimates/ImportEstimateModal';
import { Upload } from 'lucide-react';
```

**Add state** (near other useState declarations):
```typescript
const [showImportModal, setShowImportModal] = useState(false);
```

**Add handler** (near other handlers like addLineItem):
```typescript
const handleImportItems = (items: any[]) => {
  setLineItems(prev => [...prev, ...items]);
  toast.success(`Added ${items.length} line items`);
};
```

**Add button** (next to "Add Line Item" button):
```tsx
<Button onClick={() => setShowImportModal(true)} variant="outline" size="sm" className="gap-2">
  <Upload className="h-3.5 w-3.5" />
  Import
</Button>
```

**Add modal** (before final closing tag):
```tsx
<ImportEstimateModal
  isOpen={showImportModal}
  onClose={() => setShowImportModal(false)}
  onImport={handleImportItems}
/>
```

---

## Dependencies

```bash
npm install xlsx react-dropzone
```

---

## Deploy Edge Function (Optional)

Only needed if you want LLM enrichment:

```bash
mkdir -p supabase/functions/enrich-estimate-items
# Copy edge function code
supabase functions deploy enrich-estimate-items
```

---

## Testing Checklist

### Unit Tests
- [ ] Header detection finds row with "Item, Labor, Material, Sub, Markup"
- [ ] Header detection works with typos ("Matreial", "Mark up")
- [ ] Header detection works with extra whitespace
- [ ] Stop marker "Total Cost" stops scanning
- [ ] Stop marker "Expenses" stops scanning
- [ ] 3 consecutive empty rows stops scanning
- [ ] Currency parsing: `$12,345.67`, `12345`, `(1,234.00)`
- [ ] Percent parsing: `25%`, `25.00%`, `0.25`
- [ ] Compound row Labor+Material creates 2 items
- [ ] Compound row Material+Sub creates 2 items
- [ ] Split items have `wasSplit: true` and correct names
- [ ] Summary rows are skipped

### Integration Tests
- [ ] Upload UC Neuro Budget Sheet CSV
- [ ] Verify 12 extracted line items (not 90+ rows)
- [ ] Verify Demo splits into Labor + Materials
- [ ] Verify Framing splits into Materials + Sub
- [ ] Verify Supervision is management (0% markup)
- [ ] Verify totals match expected values

### UI Tests
- [ ] Drag-and-drop works
- [ ] Loading state shows during processing
- [ ] Warnings display correctly
- [ ] Select/deselect items works
- [ ] Import button adds items to estimate
- [ ] Mobile layout works
