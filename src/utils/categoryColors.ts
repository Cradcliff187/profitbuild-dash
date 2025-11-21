import { LineItemCategory } from '@/types/estimate';

/**
 * Standardized category colors using theme variables
 * Used across line item tables, schedule views, and badges
 */
export const getCategoryThemeColor = (category: string): string => {
  switch (category) {
    case 'labor_internal':
    case LineItemCategory.LABOR:
      return 'primary';
    case 'subcontractors':
    case LineItemCategory.SUBCONTRACTOR:
      return 'accent';
    case 'materials':
    case LineItemCategory.MATERIALS:
      return 'emerald';
    case 'equipment':
    case LineItemCategory.EQUIPMENT:
      return 'amber';
    case 'permits':
    case LineItemCategory.PERMITS:
      return 'destructive';
    case 'management':
    case LineItemCategory.MANAGEMENT:
      return 'success';
    case 'tools':
      return 'indigo';
    case 'software':
      return 'cyan';
    case 'vehicle_maintenance':
      return 'orange';
    case 'gas':
      return 'yellow';
    case 'meals':
      return 'pink';
    default:
      return 'slate';
  }
};

/**
 * For table badge usage with outline variant
 */
export const getCategoryBadgeClasses = (category: string): string => {
  const theme = getCategoryThemeColor(category);
  
  // Use Tailwind colors with proper contrast
  const classMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    success: 'bg-success/10 text-success border-success/20',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  
  return classMap[theme] || classMap.slate;
};

/**
 * For Gantt chart hex colors
 */
export const getCategoryHexColor = (category: string): string => {
  const theme = getCategoryThemeColor(category);
  
  // Hex colors for Gantt chart
  const hexMap: Record<string, string> = {
    primary: '#3b82f6',      // blue-500 for labor_internal
    accent: '#a855f7',       // purple-500 for subcontractors
    emerald: '#10b981',      // emerald-500 for materials
    amber: '#f59e0b',        // amber-500 for equipment
    destructive: '#ef4444',  // red-500 for permits
    success: '#22c55e',      // green-500 for management
    indigo: '#6366f1',       // indigo-500 for tools
    cyan: '#06b6d4',         // cyan-500 for software
    orange: '#f97316',       // orange-500 for vehicle_maintenance
    yellow: '#eab308',       // yellow-500 for gas
    pink: '#ec4899',         // pink-500 for meals
    slate: '#94a3b8',        // slate-400 for other
  };
  
  return hexMap[theme] || hexMap.slate;
};

/**
 * Dot indicator for inline displays
 */
export const getCategoryDotClasses = (category: string): string => {
  const theme = getCategoryThemeColor(category);
  
  const dotMap: Record<string, string> = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    destructive: 'bg-destructive',
    success: 'bg-success',
    indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    pink: 'bg-pink-500',
    slate: 'bg-slate-400',
  };
  
  return dotMap[theme] || dotMap.slate;
};
