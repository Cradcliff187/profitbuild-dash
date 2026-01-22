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
  
  return isNegative ? -Math.abs(num) : Math.abs(num); // Always positive for costs
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
