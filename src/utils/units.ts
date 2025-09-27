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

// Comprehensive construction units library
export const CONSTRUCTION_UNITS: UnitDefinition[] = [
  // Count
  { code: 'EA', name: 'Each', category: UnitCategory.COUNT, symbol: 'ea' },
  
  // Length
  { code: 'IN', name: 'Inch', category: UnitCategory.LENGTH, symbol: 'in' },
  { code: 'FT', name: 'Foot', category: UnitCategory.LENGTH, symbol: 'ft' },
  { code: 'LF', name: 'Linear Foot', category: UnitCategory.LENGTH, symbol: 'lf' },
  { code: 'YD', name: 'Yard', category: UnitCategory.LENGTH, symbol: 'yd' },
  { code: 'M', name: 'Meter', category: UnitCategory.LENGTH, symbol: 'm' },
  
  // Area
  { code: 'SF', name: 'Square Foot', category: UnitCategory.AREA, symbol: 'sf' },
  { code: 'SY', name: 'Square Yard', category: UnitCategory.AREA, symbol: 'sy' },
  { code: 'SQ', name: 'Square (100 SF)', category: UnitCategory.AREA, symbol: 'sq' },
  { code: 'ACRE', name: 'Acre', category: UnitCategory.AREA, symbol: 'acre' },
  { code: 'SM', name: 'Square Meter', category: UnitCategory.AREA, symbol: 'sm' },
  
  // Volume
  { code: 'CF', name: 'Cubic Foot', category: UnitCategory.VOLUME, symbol: 'cf' },
  { code: 'CY', name: 'Cubic Yard', category: UnitCategory.VOLUME, symbol: 'cy' },
  { code: 'CM3', name: 'Cubic Meter', category: UnitCategory.VOLUME, symbol: 'cm³' },
  
  // Weight
  { code: 'LB', name: 'Pound', category: UnitCategory.WEIGHT, symbol: 'lb' },
  { code: 'TON', name: 'Ton', category: UnitCategory.WEIGHT, symbol: 'ton' },
  { code: 'KG', name: 'Kilogram', category: UnitCategory.WEIGHT, symbol: 'kg' },
  
  // Time
  { code: 'HR', name: 'Hour', category: UnitCategory.TIME, symbol: 'hr' },
  { code: 'DAY', name: 'Day', category: UnitCategory.TIME, symbol: 'day' },
  { code: 'WK', name: 'Week', category: UnitCategory.TIME, symbol: 'wk' },
  { code: 'MO', name: 'Month', category: UnitCategory.TIME, symbol: 'mo' },
  
  // Liquid
  { code: 'PT', name: 'Pint', category: UnitCategory.LIQUID, symbol: 'pt' },
  { code: 'QT', name: 'Quart', category: UnitCategory.LIQUID, symbol: 'qt' },
  { code: 'GAL', name: 'Gallon', category: UnitCategory.LIQUID, symbol: 'gal' },
  { code: 'L', name: 'Liter', category: UnitCategory.LIQUID, symbol: 'l' },
  
  // Material
  { code: 'BAG', name: 'Bag', category: UnitCategory.MATERIAL, symbol: 'bag' },
  { code: 'ROLL', name: 'Roll', category: UnitCategory.MATERIAL, symbol: 'roll' },
  { code: 'BOX', name: 'Box', category: UnitCategory.MATERIAL, symbol: 'box' },
  { code: 'PALLET', name: 'Pallet', category: UnitCategory.MATERIAL, symbol: 'pallet' },
  { code: 'SHEET', name: 'Sheet', category: UnitCategory.MATERIAL, symbol: 'sheet' }
];

// Category-based unit recommendations for line items
export const CATEGORY_UNIT_RECOMMENDATIONS: Record<string, string[]> = {
  'labor_internal': ['HR', 'DAY', 'WK'],
  'materials': ['SF', 'LF', 'EA', 'BAG', 'ROLL', 'BOX', 'PALLET', 'SHEET', 'CY', 'CF', 'GAL', 'LB', 'TON'],
  'equipment': ['HR', 'DAY', 'WK', 'MO', 'EA']
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

// Helper function to get recommended unit codes for a line item category
export function getRecommendedUnitCodes(category: string): string[] {
  return CATEGORY_UNIT_RECOMMENDATIONS[category] || ['EA'];
}

// Validation function to check unit compatibility between estimate and quote
export function validateUnitCompatibility(
  estimateUnit: string | null, 
  quoteUnit: string | null
): { isCompatible: boolean; message: string } {
  // Both null - compatible but with warning
  if (!estimateUnit && !quoteUnit) {
    return { isCompatible: true, message: "No units specified" };
  }

  // Same units - perfect match
  if (estimateUnit === quoteUnit) {
    return { isCompatible: true, message: "Units match" };
  }

  // Define compatible unit groups
  const compatibleUnitGroups = [
    ['IN', 'FT', 'LF', 'YD', 'M'], // Length units
    ['SF', 'SY', 'SQ', 'ACRE', 'SM'], // Area units
    ['CF', 'CY', 'CM3'], // Volume units
    ['LB', 'TON', 'KG'], // Weight units
    ['HR', 'DAY', 'WK', 'MO'], // Time units
    ['PT', 'QT', 'GAL', 'L'], // Liquid units
    ['BAG', 'ROLL', 'BOX', 'PALLET', 'SHEET', 'EA'] // Material/Count units
  ];

  // Check if both units are in the same compatible group
  if (estimateUnit && quoteUnit) {
    for (const group of compatibleUnitGroups) {
      if (group.includes(estimateUnit) && group.includes(quoteUnit)) {
        return { isCompatible: true, message: "Compatible units within same category" };
      }
    }
  }

  // Unit mismatch
  return { 
    isCompatible: false, 
    message: `Unit mismatch: ${estimateUnit || 'none'} vs ${quoteUnit || 'none'}` 
  };
}