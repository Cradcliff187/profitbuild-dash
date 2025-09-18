import { ExpenseCategory } from '@/types/expense';

/**
 * Default QuickBooks account to expense category mapping
 * Maps common QuickBooks account paths to internal expense categories
 */
export const QB_ACCOUNT_MAPPING: Record<string, ExpenseCategory> = {
  // Subcontractor/Contract Labor costs
  'Cost of goods sold:Contract labor': ExpenseCategory.SUBCONTRACTOR,
  'Job Expenses:Subcontractors': ExpenseCategory.SUBCONTRACTOR,
  'Expenses:Contract Labor': ExpenseCategory.SUBCONTRACTOR,
  'Cost of Goods Sold:Subcontractors': ExpenseCategory.SUBCONTRACTOR,
  
  // Materials and supplies
  'Cost of goods sold:Supplies & materials': ExpenseCategory.MATERIALS,
  'Job Expenses:Materials and Supplies': ExpenseCategory.MATERIALS,
  'Expenses:Materials': ExpenseCategory.MATERIALS,
  'Cost of Goods Sold:Materials': ExpenseCategory.MATERIALS,
  'Expenses:Job Materials': ExpenseCategory.MATERIALS,
  
  // Equipment rental and tools
  'Cost of goods sold:Equipment rental - COGS': ExpenseCategory.EQUIPMENT,
  'Job Expenses:Equipment Rental': ExpenseCategory.EQUIPMENT,
  'Expenses:Tools and Equipment': ExpenseCategory.EQUIPMENT,
  'Expenses:Equipment Rental': ExpenseCategory.EQUIPMENT,
  'Cost of Goods Sold:Equipment': ExpenseCategory.EQUIPMENT,
  
  // Permits and fees
  'Expenses:Permits and Licenses': ExpenseCategory.PERMITS,
  'Job Expenses:Permits': ExpenseCategory.PERMITS,
  'Expenses:Building Permits': ExpenseCategory.PERMITS,
  'Job Expenses:Permits and Fees': ExpenseCategory.PERMITS,
  
  // Management and office expenses  
  'Expenses:Office Supplies': ExpenseCategory.MANAGEMENT,
  'Expenses:Management': ExpenseCategory.MANAGEMENT,
  'Expenses:Administrative': ExpenseCategory.MANAGEMENT,
  'General & Administrative:Management': ExpenseCategory.MANAGEMENT,
};

/**
 * Resolves QuickBooks account path to expense category
 * Uses direct mapping first, then falls back to partial matching
 */
export const resolveQBAccountCategory = (accountPath: string): ExpenseCategory => {
  // Direct mapping lookup
  const directMatch = QB_ACCOUNT_MAPPING[accountPath];
  if (directMatch) return directMatch;
  
  // Partial matching logic for flexibility
  const lowerPath = accountPath.toLowerCase();
  
  // Check for subcontractor/labor keywords
  if (lowerPath.includes('contract') || 
      lowerPath.includes('subcontractor') || 
      lowerPath.includes('labor')) {
    return ExpenseCategory.SUBCONTRACTOR;
  }
  
  // Check for materials/supplies keywords
  if (lowerPath.includes('material') || 
      lowerPath.includes('supplies') || 
      lowerPath.includes('lumber') ||
      lowerPath.includes('hardware')) {
    return ExpenseCategory.MATERIALS;
  }
  
  // Check for equipment keywords
  if (lowerPath.includes('equipment') || 
      lowerPath.includes('rental') || 
      lowerPath.includes('tools') ||
      lowerPath.includes('machinery')) {
    return ExpenseCategory.EQUIPMENT;
  }
  
  // Check for permits/licenses keywords
  if (lowerPath.includes('permit') || 
      lowerPath.includes('license') || 
      lowerPath.includes('fees') ||
      lowerPath.includes('inspection')) {
    return ExpenseCategory.PERMITS;
  }
  
  // Check for management/office keywords
  if (lowerPath.includes('management') || 
      lowerPath.includes('office') || 
      lowerPath.includes('administrative') ||
      lowerPath.includes('overhead')) {
    return ExpenseCategory.MANAGEMENT;
  }
  
  // Default fallback
  return ExpenseCategory.OTHER;
};

/**
 * Gets all available QuickBooks account mappings
 */
export const getQBAccountMappings = (): Record<string, ExpenseCategory> => {
  return { ...QB_ACCOUNT_MAPPING };
};

/**
 * Validates if an account path has a known mapping
 */
export const hasQBAccountMapping = (accountPath: string): boolean => {
  return accountPath in QB_ACCOUNT_MAPPING;
};