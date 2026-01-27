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
  
  // MM-DD-YYYY or DD-MM-YYYY format (ambiguous - need validation)
  if (!parsed) {
    const dashMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dashMatch) {
      const [, first, second, year] = dashMatch;
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);
      
      // Validate and disambiguate:
      // If first > 12, it must be DD-MM-YYYY (day-month-year)
      // If first <= 12 and second <= 12, assume MM-DD-YYYY (US format)
      // If first <= 12 and second > 12, it must be MM-DD-YYYY (month-day-year)
      
      if (firstNum > 12 && secondNum >= 1 && secondNum <= 12) {
        // DD-MM-YYYY: first is day, second is month
        parsed = new Date(parseInt(year), secondNum - 1, firstNum, 12, 0, 0);
      } else if (firstNum >= 1 && firstNum <= 12) {
        // MM-DD-YYYY: first is month, second is day
        parsed = new Date(parseInt(year), firstNum - 1, secondNum, 12, 0, 0);
      }
      // If both > 12, invalid date - leave parsed as null
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
export const detectDateFormat = (dateString: string | null | undefined): 'M/D/YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'DD-MM-YYYY' | 'unknown' => {
  if (!dateString?.trim()) return 'unknown';
  
  const trimmed = dateString.trim();
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return 'M/D/YYYY';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'YYYY-MM-DD';
  
  // Check for DD-DD-YYYY format (ambiguous between MM-DD-YYYY and DD-MM-YYYY)
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [first, second] = trimmed.split('-').map(n => parseInt(n));
    // If first > 12, it's definitely DD-MM-YYYY
    if (first > 12) return 'DD-MM-YYYY';
    // If second > 12, it's definitely MM-DD-YYYY
    if (second > 12) return 'MM-DD-YYYY';
    // Otherwise ambiguous, default to US format
    return 'MM-DD-YYYY';
  }
  
  return 'unknown';
};

