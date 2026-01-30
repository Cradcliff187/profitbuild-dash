/**
 * Centralized status color definitions
 * Single source of truth for all status badges across the app
 * 
 * Color Philosophy:
 * - Estimating: Amber (work in progress, needs attention)
 * - Approved: Green (positive, ready to start)
 * - In Progress: Blue (active, working)
 * - Complete: Emerald (success, finished - distinct from approved)
 * - On Hold: Yellow (warning, paused)
 * - Cancelled: Red (negative, stopped)
 */

// =============================================================================
// PROJECT STATUS COLORS
// =============================================================================

export type ProjectStatus = 
  | 'estimating' 
  | 'approved' 
  | 'in_progress' 
  | 'complete' 
  | 'on_hold' 
  | 'cancelled';

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  estimating: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  approved: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  on_hold: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
  cancelled: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
};

export const getProjectStatusColor = (status: ProjectStatus | string): string => {
  if (process.env.NODE_ENV === 'development' && !(status in PROJECT_STATUS_COLORS)) {
    console.warn(`Unknown project status: "${status}". Using default color.`);
  }
  return PROJECT_STATUS_COLORS[status as ProjectStatus] || PROJECT_STATUS_COLORS.estimating;
};

// =============================================================================
// ESTIMATE STATUS COLORS
// =============================================================================

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export const ESTIMATE_STATUS_COLORS: Record<EstimateStatus, string> = {
  draft: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  approved: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300',
  rejected: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
  expired: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
};

export const getEstimateStatusColor = (status: EstimateStatus | string): string => {
  if (process.env.NODE_ENV === 'development' && !(status in ESTIMATE_STATUS_COLORS)) {
    console.warn(`Unknown estimate status: "${status}". Using default color.`);
  }
  return ESTIMATE_STATUS_COLORS[status as EstimateStatus] || ESTIMATE_STATUS_COLORS.draft;
};

// =============================================================================
// EXPENSE STATUS COLORS
// =============================================================================

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  approved: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300',
  rejected: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
};

export const getExpenseStatusColor = (status: ExpenseStatus | string): string => {
  if (process.env.NODE_ENV === 'development' && !(status in EXPENSE_STATUS_COLORS)) {
    console.warn(`Unknown expense status: "${status}". Using default color.`);
  }
  return EXPENSE_STATUS_COLORS[status as ExpenseStatus] || EXPENSE_STATUS_COLORS.pending;
};

// =============================================================================
// CHANGE ORDER STATUS COLORS
// =============================================================================

export type ChangeOrderStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export const CHANGE_ORDER_STATUS_COLORS: Record<ChangeOrderStatus, string> = {
  draft: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  approved: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300',
  rejected: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
};

export const getChangeOrderStatusColor = (status: ChangeOrderStatus | string): string => {
  if (process.env.NODE_ENV === 'development' && !(status in CHANGE_ORDER_STATUS_COLORS)) {
    console.warn(`Unknown change order status: "${status}". Using default color.`);
  }
  return CHANGE_ORDER_STATUS_COLORS[status as ChangeOrderStatus] || CHANGE_ORDER_STATUS_COLORS.draft;
};

// =============================================================================
// QUOTE STATUS COLORS
// =============================================================================

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
  accepted: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300',
  rejected: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
  expired: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const getQuoteStatusColor = (status: QuoteStatus | string): string => {
  if (process.env.NODE_ENV === 'development' && !(status in QUOTE_STATUS_COLORS)) {
    console.warn(`Unknown quote status: "${status}". Using default color.`);
  }
  return QUOTE_STATUS_COLORS[status as QuoteStatus] || QUOTE_STATUS_COLORS.pending;
};
