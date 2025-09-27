// ============================================
// CONSTRUCTION UNITS OF MEASUREMENT SYSTEM - PHASE 1
// ============================================

export enum UnitCategory {
  COUNT = 'count',
  LENGTH = 'length',
  AREA = 'area',
  VOLUME = 'volume',
  WEIGHT = 'weight',
  TIME = 'time',
  LIQUID = 'liquid',
  MATERIAL = 'material'
}

export interface UnitDefinition {
  code: string;
  name: string;
  category: UnitCategory;
  symbol: string;
}

// Common construction units (Phase 1 - starting small)
export const CONSTRUCTION_UNITS: UnitDefinition[] = [
  { code: 'EA', name: 'Each', category: UnitCategory.COUNT, symbol: 'ea' },
  { code: 'LF', name: 'Linear Foot', category: UnitCategory.LENGTH, symbol: 'lf' },
  { code: 'SF', name: 'Square Foot', category: UnitCategory.AREA, symbol: 'sf' },
  { code: 'SY', name: 'Square Yard', category: UnitCategory.AREA, symbol: 'sy' },
  { code: 'CY', name: 'Cubic Yard', category: UnitCategory.VOLUME, symbol: 'cy' },
  { code: 'HR', name: 'Hour', category: UnitCategory.TIME, symbol: 'hr' },
  { code: 'GAL', name: 'Gallon', category: UnitCategory.LIQUID, symbol: 'gal' },
  { code: 'SHEET', name: 'Sheet', category: UnitCategory.MATERIAL, symbol: 'sheet' }
];

// Category-based unit recommendations for line items
export const CATEGORY_UNIT_RECOMMENDATIONS: Record<string, string[]> = {
  'labor_internal': ['HR'],
  'materials': ['SF', 'LF', 'CY', 'EA', 'GAL', 'SHEET'],
  'equipment': ['HR', 'EA']
};

// Utility function to format quantity with unit
export function formatQuantityWithUnit(quantity: number, unit: string | null): string {
  if (!unit) {
    return quantity.toLocaleString();
  }

  const unitDef = CONSTRUCTION_UNITS.find(u => u.code === unit);
  const symbol = unitDef ? unitDef.symbol : unit.toLowerCase();
  
  return `${quantity.toLocaleString()} ${symbol}`;
}

// Helper function to get unit definition by code
export function getUnitByCode(code: string): UnitDefinition | undefined {
  return CONSTRUCTION_UNITS.find(u => u.code === code);
}

// Helper function to get units by category
export function getUnitsByCategory(category: UnitCategory): UnitDefinition[] {
  return CONSTRUCTION_UNITS.filter(u => u.category === category);
}

// Helper function to get recommended units for a line item category
export function getRecommendedUnits(category: string): UnitDefinition[] {
  const codes = CATEGORY_UNIT_RECOMMENDATIONS[category] || [];
  return codes.map(code => CONSTRUCTION_UNITS.find(u => u.code === code))
             .filter(Boolean) as UnitDefinition[];
}