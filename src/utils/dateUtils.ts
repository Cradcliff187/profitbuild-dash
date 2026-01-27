/**
 * Safely parse a date-only string (YYYY-MM-DD) from the database.
 * 
 * Problem: When JavaScript parses "2025-11-19" it interprets as midnight UTC.
 * In Eastern timezone (UTC-5), this becomes 7PM on Nov 18 - the PREVIOUS day!
 * 
 * Solution: Add T12:00:00 (noon) to prevent timezone day-shift issues.
 * Noon is safe because no timezone offset will push it to a different day.
 * 
 * @param dateInput - Date string in YYYY-MM-DD format from database, or Date object
 * @returns Date object at noon local time
 */
export const parseDateOnly = (dateInput: string | Date | null | undefined): Date => {
  if (!dateInput) return new Date();
  
  // If it's already a Date object, return it as-is
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // If it's a string, check if it's already a full ISO string with time
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      return new Date(dateInput);
    }
    
    // Add noon time to date-only strings to prevent timezone day-shift
    return new Date(dateInput + 'T12:00:00');
  }
  
  // Fallback
  return new Date();
};

/**
 * Format a date for display, handling the timezone issue.
 * Use this when you have a date string and want to display it directly.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDateString = (
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: '2-digit' }
): string => {
  if (!dateString) return '';
  return parseDateOnly(dateString).toLocaleDateString('en-US', options);
};

/**
 * Format a Date object to YYYY-MM-DD string for database storage.
 * Extracts date components directly to avoid timezone issues with toISOString().
 * 
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a CSV date string to YYYY-MM-DD format for database storage.
 * Handles multiple formats and creates dates at noon to prevent timezone shifts.
 * 
 * Supported formats:
 * - M/D/YYYY (QuickBooks format, e.g., "1/15/2026")
 * - YYYY-MM-DD (ISO format)
 * - MM-DD-YYYY
 * 
 * @param dateString - Date string from CSV
 * @param fallbackToToday - If true, returns today's date when input is empty/invalid
 * @returns Date string in YYYY-MM-DD format, or null
 */
export const parseCsvDateForDB = (
  dateString: string | null | undefined,
  fallbackToToday: boolean = true
): string | null => {
  if (!dateString?.trim()) {
    return fallbackToToday ? formatDateForDB(new Date()) : null;
  }

  const trimmed = dateString.trim();
  let parsed: Date | null = null;
  
  // M/D/YYYY (QuickBooks format)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
  }
  
  // YYYY-MM-DD (ISO format)
  if (!parsed) {
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
  }
  
  // MM-DD-YYYY format
  if (!parsed) {
    const dashMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dashMatch) {
      const [, month, day, year] = dashMatch;
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
  }
  
  // Fallback: native parsing with component extraction to avoid timezone issues
  if (!parsed) {
    const native = new Date(trimmed);
    if (!isNaN(native.getTime())) {
      // Extract components and recreate at noon to be timezone-safe
      parsed = new Date(native.getFullYear(), native.getMonth(), native.getDate(), 12, 0, 0);
    }
  }
  
  return parsed && !isNaN(parsed.getTime()) 
    ? formatDateForDB(parsed) 
    : (fallbackToToday ? formatDateForDB(new Date()) : null);
};

/**
 * Detect the date format of a CSV date string.
 * Useful for validation and error messages.
 * 
 * @param dateString - Date string to analyze
 * @returns Detected format or 'unknown'
 */
export const detectDateFormat = (dateString: string | null | undefined): 'M/D/YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'unknown' => {
  if (!dateString?.trim()) return 'unknown';
  
  const trimmed = dateString.trim();
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return 'M/D/YYYY';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'YYYY-MM-DD';
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return 'MM-DD-YYYY';
  
  return 'unknown';
};

