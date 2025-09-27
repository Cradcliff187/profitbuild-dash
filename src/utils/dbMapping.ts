// Utility functions to map between camelCase TypeScript and snake_case database fields

import { LineItem } from '@/types/estimate';

// Normalizes unit variations to standard codes
export const normalizeUnit = (unit: string | null | undefined): string | null => {
  if (!unit) return null;
  
  const normalizedUnit = unit.toLowerCase().trim();
  
  // Common unit variations mapping
  const unitMappings: Record<string, string> = {
    // Area units
    'sqft': 'SF',
    'sq ft': 'SF',
    'square ft': 'SF',
    'square foot': 'SF',
    'square feet': 'SF',
    'sq yd': 'SY',
    'square yard': 'SY',
    'square yards': 'SY',
    'square meter': 'SM',
    'square meters': 'SM',
    
    // Length units
    'inch': 'IN',
    'inches': 'IN',
    'foot': 'FT',
    'feet': 'FT',
    'lf': 'LF',
    'linear ft': 'LF',
    'linear foot': 'LF',
    'linear feet': 'LF',
    'yard': 'YD',
    'yards': 'YD',
    'meter': 'M',
    'meters': 'M',
    
    // Volume units
    'cubic foot': 'CF',
    'cubic feet': 'CF',
    'cu ft': 'CF',
    'cubic yard': 'CY',
    'cubic yards': 'CY',
    'cu yd': 'CY',
    'cy': 'CY',
    'cubic meter': 'CM3',
    'cubic meters': 'CM3',
    
    // Weight units
    'pound': 'LB',
    'pounds': 'LB',
    'lbs': 'LB',
    'kilogram': 'KG',
    'kilograms': 'KG',
    'kgs': 'KG',
    
    // Time units
    'hr': 'HR',
    'hour': 'HR',
    'hours': 'HR',
    'day': 'DAY',
    'days': 'DAY',
    'week': 'WK',
    'weeks': 'WK',
    'month': 'MO',
    'months': 'MO',
    
    // Liquid units
    'pint': 'PT',
    'pints': 'PT',
    'quart': 'QT',
    'quarts': 'QT',
    'gallon': 'GAL',
    'gallons': 'GAL',
    'liter': 'L',
    'liters': 'L',
    
    // Material/Count units
    'each': 'EA',
    'ea': 'EA',
    'bag': 'BAG',
    'bags': 'BAG',
    'roll': 'ROLL',
    'rolls': 'ROLL',
    'box': 'BOX',
    'boxes': 'BOX',
    'pallet': 'PALLET',
    'pallets': 'PALLET',
    'sheet': 'SHEET',
    'sheets': 'SHEET'
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