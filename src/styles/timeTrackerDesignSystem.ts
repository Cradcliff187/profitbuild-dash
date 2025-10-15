/**
 * Time Tracker Design System
 * Centralized design tokens for consistent compact styling
 * Following construction industry best practices for data-dense interfaces
 */

export const timeTrackerDesign = {
  // Typography Scale
  typography: {
    headerLarge: 'text-base font-semibold',      // Main page titles (reduced from text-2xl)
    headerMedium: 'text-sm font-semibold',       // Section headers (reduced from text-xl)
    headerSmall: 'text-xs font-medium',          // Card/table headers (reduced from text-base)
    bodyNormal: 'text-sm',                        // Regular text (reduced from text-base)
    bodySmall: 'text-xs',                         // Secondary text (reduced from text-sm)
    bodyTiny: 'text-[11px]',                      // Tertiary labels
    dataNumber: 'text-sm font-mono font-medium', // Numbers/amounts
    dataLarge: 'text-lg font-mono font-bold',    // Large numbers (timer display)
    label: 'text-xs font-medium',                 // Form labels
  },
  
  // Spacing System
  spacing: {
    cardPadding: 'p-2',           // Card content (reduced from p-4/p-6)
    cardPaddingLarge: 'p-3',      // Slightly larger card padding
    sectionGap: 'space-y-2',      // Between sections (reduced from space-y-4)
    itemGap: 'gap-2',             // Between items (reduced from gap-4)
    tablePadding: 'px-2 py-1.5',  // Table cells
    compactMargin: 'mb-2',        // Margins (reduced from mb-4)
    pageInset: 'p-3',             // Page container padding
  },
  
  // Component Heights
  heights: {
    input: 'h-8',                 // Inputs (reduced from h-10/h-12)
    button: 'h-8',                // Standard buttons (reduced from h-10)
    buttonLarge: 'h-10',          // Primary action buttons
    select: 'h-8',                // Dropdowns
    header: 'h-12',               // Page header
    tabNav: 'h-10',               // Tab navigation
    row: 'h-9',                   // Table rows
  },
  
  // Icon Sizes
  icons: {
    small: 'w-3.5 h-3.5',         // Small icons (reduced from w-4 h-4)
    normal: 'w-4 h-4',            // Normal icons (reduced from w-5 h-5)
    large: 'w-5 h-5',             // Large icons (reduced from w-6 h-6)
  },
  
  // Button Variants
  buttons: {
    compact: 'h-7 px-2.5 text-xs',
    dense: 'h-8 px-3 text-sm',
    primary: 'h-10 px-4 text-base',
  },
  
  // Badge Sizes
  badges: {
    tiny: 'text-[10px] px-1.5 py-0.5',
    small: 'text-xs px-2 py-0.5',
    normal: 'text-sm px-2.5 py-1',
  },
};
