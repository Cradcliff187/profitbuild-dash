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

