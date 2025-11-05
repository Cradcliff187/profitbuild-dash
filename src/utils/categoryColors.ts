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
      return 'secondary';
    case 'equipment':
    case LineItemCategory.EQUIPMENT:
      return 'muted';
    case 'permits':
    case LineItemCategory.PERMITS:
      return 'destructive';
    case 'management':
    case LineItemCategory.MANAGEMENT:
      return 'success';
    default:
      return 'muted-foreground';
  }
};

/**
 * For table badge usage with outline variant
 */
export const getCategoryBadgeClasses = (category: string): string => {
  const theme = getCategoryThemeColor(category);
  
  // Use Tailwind theme colors with proper contrast
  const classMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
    secondary: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    success: 'bg-success/10 text-success border-success/20',
    muted: 'bg-muted text-muted-foreground border-muted',
    'muted-foreground': 'bg-muted text-muted-foreground border-muted',
  };
  
  return classMap[theme] || classMap.muted;
};

/**
 * For Gantt chart hex colors
 */
export const getCategoryHexColor = (category: string): string => {
  const theme = getCategoryThemeColor(category);
  
  // These should match the HSL values from index.css
  // primary: blue, accent: purple, secondary: emerald, destructive: red, success: green
  const hexMap: Record<string, string> = {
    primary: '#3b82f6',           // blue-500 for labor_internal
    accent: '#a855f7',            // purple-500 for subcontractors
    secondary: '#10b981',         // emerald-500 for materials
    destructive: '#ef4444',       // red-500 for permits
    success: '#22c55e',           // green-500 for management
    muted: '#9ca3af',             // gray-400 for equipment
    'muted-foreground': '#9ca3af', // gray-400 for other
  };
  
  return hexMap[theme] || hexMap.muted;
};

/**
 * Dot indicator for inline displays
 */
export const getCategoryDotClasses = (category: string): string => {
  const theme = getCategoryThemeColor(category);
  
  const dotMap: Record<string, string> = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    secondary: 'bg-secondary',
    destructive: 'bg-destructive',
    success: 'bg-success',
    muted: 'bg-muted',
    'muted-foreground': 'bg-muted-foreground',
  };
  
  return dotMap[theme] || dotMap.muted;
};
