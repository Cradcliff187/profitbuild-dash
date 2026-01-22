import { describe, it, expect } from 'vitest';
import {
  findHeaderRow,
  mapColumns,
  detectTableRegion,
  extractLineItems,
  validateTotals,
  extractBudgetSheet,
} from '../budgetSheetParser';
import { Grid, BudgetColumns } from '@/types/importTypes';

describe('budgetSheetParser', () => {
  describe('findHeaderRow', () => {
    it('finds Budget Sheet header with exact columns', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor ', 'Material', 'Sub', 'Total', 'Markup', 'Total with Mark Up'],
          ['Ceilings', 'Cincinnati Interiors', '', '$0.00', '$24,970.00', '$24,970.00', '25.00%', '$31,212.50'],
        ],
        rowCount: 2,
        colCount: 8,
      };

      const result = findHeaderRow(grid);
      expect(result).not.toBeNull();
      expect(result?.rowIndex).toBe(0);
      expect(result?.score).toBeGreaterThan(10);
    });

    it('handles extra whitespace in headers', () => {
      const grid: Grid = {
        rows: [
          ['  Item  ', ' Subcontractor ', ' Labor', 'Material ', 'Sub ', ' Total', 'Markup ', ' Total with Mark Up '],
          ['Test', 'RCG', '$100', '$200', '$0', '$300', '25%', '$375'],
        ],
        rowCount: 2,
        colCount: 8,
      };

      const result = findHeaderRow(grid);
      expect(result).not.toBeNull();
      expect(result?.rowIndex).toBe(0);
    });

    it('returns null for file with no header', () => {
      const grid: Grid = {
        rows: [
          ['Just', 'some', 'random', 'text'],
          ['with', 'no', 'budget', 'columns'],
        ],
        rowCount: 2,
        colCount: 4,
      };

      const result = findHeaderRow(grid);
      expect(result).toBeNull();
    });
  });

  describe('mapColumns', () => {
    it('maps standard Budget Sheet columns', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor', 'Material', 'Sub', 'Total', 'Markup', 'Total with Mark Up'],
        ],
        rowCount: 1,
        colCount: 8,
      };

      const result = mapColumns(grid, 0);
      
      expect(result.columns.itemCol).toBe(0);
      expect(result.columns.subcontractorCol).toBe(1);
      expect(result.columns.laborCol).toBe(2);
      expect(result.columns.materialCol).toBe(3);
      expect(result.columns.subCol).toBe(4);
      expect(result.columns.totalCol).toBe(5);
      expect(result.columns.markupCol).toBe(6);
      expect(result.columns.totalWithMarkupCol).toBe(7);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('warns when required columns are missing', () => {
      const grid: Grid = {
        rows: [
          ['Name', 'Price', 'Quantity'], // Missing cost columns
        ],
        rowCount: 1,
        colCount: 3,
      };

      const result = mapColumns(grid, 0);
      
      expect(result.warnings).toHaveLength(2); // Item col missing + cost columns missing
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('detectTableRegion', () => {
    it('stops at "Total Cost" marker', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Sub', 'Total'],
          ['Demo', '$15,000', '$15,000'],
          ['Framing', '$27,000', '$27,000'],
          ['', '', 'Total Cost'], // Stop marker
          ['Summary', 'data', 'here'],
        ],
        rowCount: 5,
        colCount: 3,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: null,
        laborCol: null,
        materialCol: null,
        subCol: 1,
        totalCol: 2,
        markupCol: null,
        totalWithMarkupCol: null,
      };

      const result = detectTableRegion(grid, 0, columns);
      
      expect(result.endRow).toBe(3);
      expect(result.stopReason).toContain('total cost');
      expect(result.warnings).toHaveLength(1);
    });

    it('stops at "Expenses" marker', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Sub'],
          ['Paint', '$9,800'],
          ['Expenses', ''], // Stop marker
        ],
        rowCount: 3,
        colCount: 2,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: null,
        laborCol: null,
        materialCol: null,
        subCol: 1,
        totalCol: null,
        markupCol: null,
        totalWithMarkupCol: null,
      };

      const result = detectTableRegion(grid, 0, columns);
      
      expect(result.endRow).toBe(2);
      expect(result.stopReason).toContain('expenses');
    });

    it('stops after 3 consecutive empty rows', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Sub'],
          ['HVAC', '$68,000'],
          ['', ''],
          ['', ''],
          ['', ''],
          ['Footer', 'text'],
        ],
        rowCount: 6,
        colCount: 2,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: null,
        laborCol: null,
        materialCol: null,
        subCol: 1,
        totalCol: null,
        markupCol: null,
        totalWithMarkupCol: null,
      };

      const result = detectTableRegion(grid, 0, columns);
      
      expect(result.endRow).toBe(2); // Stops at row 4 (0-based), backs up 2 to row 2
      expect(result.stopReason).toContain('consecutive empty');
    });
  });

  describe('extractLineItems', () => {
    it('extracts simple subcontractor item', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor', 'Material', 'Sub', 'Markup'],
          ['Ceilings', 'Cincinnati Interiors', '', '$0.00', '$24,970.00', '25.00%'],
        ],
        rowCount: 2,
        colCount: 6,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: 1,
        laborCol: 2,
        materialCol: 3,
        subCol: 4,
        totalCol: null,
        markupCol: 5,
        totalWithMarkupCol: null,
      };

      const result = extractLineItems(grid, columns, 1, 2);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Ceilings');
      expect(result.items[0].component).toBe('sub');
      expect(result.items[0].cost).toBe(24970);
      expect(result.items[0].markupPct).toBe(0.25);
      expect(result.items[0].wasSplit).toBe(false);
    });

    it('splits compound row (Labor + Material)', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor', 'Material', 'Sub', 'Markup'],
          ['Demo', 'RCG', '$15,000.00', '$6,000.00', '$0.00', '25.00%'],
        ],
        rowCount: 2,
        colCount: 6,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: 1,
        laborCol: 2,
        materialCol: 3,
        subCol: 4,
        totalCol: null,
        markupCol: 5,
        totalWithMarkupCol: null,
      };

      const result = extractLineItems(grid, columns, 1, 2);
      
      expect(result.items).toHaveLength(2);
      expect(result.compoundRowsSplit).toBe(1);
      
      // Labor item
      expect(result.items[0].name).toBe('Demo');
      expect(result.items[0].component).toBe('labor');
      expect(result.items[0].cost).toBe(15000);
      expect(result.items[0].wasSplit).toBe(true);
      expect(result.items[0].splitFromName).toBe('Demo');
      
      // Material item
      expect(result.items[1].name).toBe('Demo - Materials');
      expect(result.items[1].component).toBe('material');
      expect(result.items[1].cost).toBe(6000);
      expect(result.items[1].wasSplit).toBe(true);
    });

    it('splits compound row (Material + Sub)', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor', 'Material', 'Sub', 'Markup'],
          ['Framing', 'Ron Mullekin', '', '$10,000.00', '$27,000.00', '25.00%'],
        ],
        rowCount: 2,
        colCount: 6,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: 1,
        laborCol: 2,
        materialCol: 3,
        subCol: 4,
        totalCol: null,
        markupCol: 5,
        totalWithMarkupCol: null,
      };

      const result = extractLineItems(grid, columns, 1, 2);
      
      expect(result.items).toHaveLength(2);
      expect(result.compoundRowsSplit).toBe(1);
      
      // Material item
      expect(result.items[0].name).toBe('Framing - Materials');
      expect(result.items[0].component).toBe('material');
      expect(result.items[0].cost).toBe(10000);
      
      // Sub item
      expect(result.items[1].name).toBe('Framing');
      expect(result.items[1].component).toBe('sub');
      expect(result.items[1].cost).toBe(27000);
      expect(result.items[1].vendorName).toBe('Ron Mullekin');
    });

    it('identifies management (RCG + 0% markup)', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor', 'Material', 'Sub', 'Markup'],
          ['Supervision', 'RCG', '$45,093.00', '$0.00', '$0.00', '0.00%'],
        ],
        rowCount: 2,
        colCount: 6,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: 1,
        laborCol: 2,
        materialCol: 3,
        subCol: 4,
        totalCol: null,
        markupCol: 5,
        totalWithMarkupCol: null,
      };

      const result = extractLineItems(grid, columns, 1, 2);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Supervision');
      expect(result.items[0].component).toBe('labor');
      expect(result.items[0].vendorName).toBe('RCG');
      expect(result.items[0].markupPct).toBe(0);
    });

    it('skips empty rows', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Sub'],
          ['', ''],
          ['Paint', '$9,800'],
          ['', '$0.00'],
        ],
        rowCount: 4,
        colCount: 2,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: null,
        laborCol: null,
        materialCol: null,
        subCol: 1,
        totalCol: null,
        markupCol: null,
        totalWithMarkupCol: null,
      };

      const result = extractLineItems(grid, columns, 1, 4);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Paint');
      // Empty rows are silently skipped, no warning needed
    });

    it('skips summary rows', () => {
      const grid: Grid = {
        rows: [
          ['Item', 'Sub'],
          ['HVAC', '$68,000'],
          ['Total', '$68,000'],
        ],
        rowCount: 3,
        colCount: 2,
      };

      const columns: BudgetColumns = {
        itemCol: 0,
        subcontractorCol: null,
        laborCol: null,
        materialCol: null,
        subCol: 1,
        totalCol: null,
        markupCol: null,
        totalWithMarkupCol: null,
      };

      const result = extractLineItems(grid, columns, 1, 3);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('HVAC');
      expect(result.warnings.some(w => w.code === 'SKIPPED_SUMMARY_ROW')).toBe(true);
    });
  });

  describe('extractBudgetSheet (integration)', () => {
    it('extracts UC Neuro Budget Sheet pattern', () => {
      // Simplified version of UC Neuro Budget Sheet
      const grid: Grid = {
        rows: [
          ['Item', 'Subcontractor', 'Labor ', 'Material', 'Sub', 'Total', 'Markup', 'Total with Mark Up'],
          ['', '', '', '', '$0.00', '30.00%', '$0.00', '$0.00'],
          ['Ceilings', 'Cincinnati Interiors', '', '$0.00', '$24,970.00', '$24,970.00', '25.00%', '$31,212.50'],
          ['Demo', 'RCG', '$15,000.00', '$6,000.00', '$0.00', '$21,000.00', '25.00%', '$26,250.00'],
          ['Framing', 'Ron Mullekin', '', '$10,000.00', '$27,000.00', '$37,000.00', '25.00%', '$46,250.00'],
          ['Supervision', 'RCG', '$45,093.00', '$0.00', '$0.00', '$45,093.00', '0.00%', '$45,093.00'],
          ['', '', '', '', '', '', '', ''],
          ['', '', '$60,093.00', '$16,000.00', '$51,970.00', '$128,063.00', '', '$148,805.50'],
          ['', '', '', '', '', '', 'Total Cost', ''],
        ],
        rowCount: 9,
        colCount: 8,
      };

      const result = extractBudgetSheet(grid);
      
      expect(result.success).toBe(true);
      expect(result.items.length).toBeGreaterThanOrEqual(5); // Should extract at least 5 items
      
      // Check compound row splitting
      expect(result.metadata.compoundRowsSplit).toBe(2); // Demo and Framing
      
      // Check specific items
      const ceilings = result.items.find(i => i.name === 'Ceilings');
      expect(ceilings).toBeDefined();
      expect(ceilings?.component).toBe('sub');
      expect(ceilings?.cost).toBe(24970);
      
      const demoLabor = result.items.find(i => i.name === 'Demo' && i.component === 'labor');
      expect(demoLabor).toBeDefined();
      expect(demoLabor?.cost).toBe(15000);
      
      const demoMaterials = result.items.find(i => i.name === 'Demo - Materials');
      expect(demoMaterials).toBeDefined();
      expect(demoMaterials?.cost).toBe(6000);
      
      const supervision = result.items.find(i => i.name === 'Supervision');
      expect(supervision).toBeDefined();
      expect(supervision?.markupPct).toBe(0);
      
      // Check metadata
      expect(result.metadata.headerRowIndex).toBe(0);
      expect(result.metadata.mappingConfidence).toBeGreaterThan(0.9);
      expect(result.metadata.stopReason).toBeTruthy(); // Should have stopped at "Total Cost"
    });
  });
});
