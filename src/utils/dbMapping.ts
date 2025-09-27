// Utility functions to map between camelCase TypeScript and snake_case database fields

import { LineItem } from '@/types/estimate';

// Normalizes unit variations to standard codes
export const normalizeUnit = (unit: string | null | undefined): string | null => {
  if (!unit) return null;
  
  const normalizedUnit = unit.toLowerCase().trim();
  
  // Common unit variations mapping
  const unitMappings: Record<string, string> = {
    'sqft': 'SF',
    'sq ft': 'SF',
    'square ft': 'SF',
    'square foot': 'SF',
    'square feet': 'SF',
    'lf': 'LF',
    'linear ft': 'LF',
    'linear foot': 'LF',
    'linear feet': 'LF',
    'cubic yard': 'CY',
    'cubic yards': 'CY',
    'cu yd': 'CY',
    'cy': 'CY',
    'each': 'EA',
    'ea': 'EA',
    'hr': 'HR',
    'hour': 'HR',
    'hours': 'HR'
  };
  
  // Return mapped unit or uppercase original
  return unitMappings[normalizedUnit] || unit.toUpperCase();
};

// Maps camelCase LineItem to snake_case database fields
export const mapLineItemToDb = (item: LineItem) => ({
  id: item.id,
  category: item.category,
  description: item.description,
  quantity: item.quantity,
  rate: item.pricePerUnit, // Map pricePerUnit to legacy rate field for DB compatibility
  total: item.total,
  unit: item.unit,
  sort_order: item.sort_order,
  cost_per_unit: item.costPerUnit,
  markup_percent: item.markupPercent,
  markup_amount: item.markupAmount,
  price_per_unit: item.pricePerUnit,
  total_cost: item.totalCost,
  total_markup: item.totalMarkup,
});

// Maps snake_case database fields to camelCase LineItem
export const mapDbToLineItem = (dbItem: any): LineItem => ({
  id: dbItem.id,
  category: dbItem.category,
  description: dbItem.description,
  quantity: dbItem.quantity || 1,
  pricePerUnit: dbItem.price_per_unit || dbItem.rate || 0,
  total: dbItem.total || 0,
  unit: normalizeUnit(dbItem.unit),
  sort_order: dbItem.sort_order,
  costPerUnit: dbItem.cost_per_unit || 0,
  markupPercent: dbItem.markup_percent,
  markupAmount: dbItem.markup_amount,
  totalCost: dbItem.total_cost || 0,
  totalMarkup: dbItem.total_markup || 0,
});