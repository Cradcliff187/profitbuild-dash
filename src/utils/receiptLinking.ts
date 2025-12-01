import { supabase } from '@/integrations/supabase/client';

export interface ReceiptForLinking {
  id: string;
  image_url: string;
  amount: number;
  captured_at: string;
  description: string | null;
  payee_id: string | null;
  payee_name: string | null;
  project_id: string | null;
  project_number: string | null;
  project_name: string | null;
  approval_status: string | null;
  // Computed fields
  match_score?: number;
  match_reasons?: string[];
}

export interface LinkReceiptParams {
  expenseId: string;
  receiptId: string;
}

export interface UnlinkReceiptParams {
  expenseId: string;
}

/**
 * Fetch all receipts available for linking
 * Does NOT filter by project since receipts are often submitted unassigned
 */
export async function fetchReceiptsForLinking(): Promise<ReceiptForLinking[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id,
      image_url,
      amount,
      captured_at,
      description,
      payee_id,
      project_id,
      approval_status,
      payees (
        payee_name
      ),
      projects (
        project_number,
        project_name
      )
    `)
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error fetching receipts for linking:', error);
    throw error;
  }

  return (data || []).map((r: any) => {
    // Handle nested data structure - Supabase returns objects for one-to-one relationships
    const payeeData = Array.isArray(r.payees) ? r.payees[0] : r.payees;
    const projectData = Array.isArray(r.projects) ? r.projects[0] : r.projects;
    
    return {
      id: r.id,
      image_url: r.image_url,
      amount: r.amount,
      captured_at: r.captured_at,
      description: r.description,
      payee_id: r.payee_id,
      payee_name: payeeData?.payee_name || null,
      project_id: r.project_id,
      project_number: projectData?.project_number || null,
      project_name: projectData?.project_name || null,
      approval_status: r.approval_status,
    };
  });
}

/**
 * Calculate a soft match score for receipt suggestions
 * Returns 0-100 score and reasons for the match
 * This is SUGGESTIVE ONLY - user makes final decision
 */
export function calculateMatchScore(
  receipt: ReceiptForLinking,
  expense: {
    amount: number;
    expense_date: string;
    payee_id?: string | null;
    project_id?: string | null;
  }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Amount match (within 5% or $5, whichever is greater)
  const amountTolerance = Math.max(expense.amount * 0.05, 5);
  const amountDiff = Math.abs(receipt.amount - expense.amount);
  if (amountDiff === 0) {
    score += 40;
    reasons.push('Exact amount match');
  } else if (amountDiff <= amountTolerance) {
    score += 25;
    reasons.push('Similar amount');
  }

  // Date match (within 7 days)
  const receiptDate = new Date(receipt.captured_at);
  const expenseDate = new Date(expense.expense_date);
  const daysDiff = Math.abs((receiptDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 1) {
    score += 30;
    reasons.push('Same day');
  } else if (daysDiff <= 3) {
    score += 20;
    reasons.push('Within 3 days');
  } else if (daysDiff <= 7) {
    score += 10;
    reasons.push('Within a week');
  }

  // Payee match
  if (expense.payee_id && receipt.payee_id === expense.payee_id) {
    score += 20;
    reasons.push('Same payee');
  }

  // Project match (bonus, not required)
  if (expense.project_id && receipt.project_id === expense.project_id) {
    score += 10;
    reasons.push('Same project');
  }

  return { score, reasons };
}

/**
 * Link a receipt to an expense
 */
export async function linkReceiptToExpense({ expenseId, receiptId }: LinkReceiptParams): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ receipt_id: receiptId })
    .eq('id', expenseId);

  if (error) {
    console.error('Error linking receipt to expense:', error);
    throw error;
  }
}

/**
 * Unlink a receipt from an expense
 */
export async function unlinkReceiptFromExpense({ expenseId }: UnlinkReceiptParams): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ receipt_id: null })
    .eq('id', expenseId);

  if (error) {
    console.error('Error unlinking receipt from expense:', error);
    throw error;
  }
}

/**
 * Fetch the linked receipt for an expense
 */
export async function fetchLinkedReceipt(receiptId: string): Promise<ReceiptForLinking | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id,
      image_url,
      amount,
      captured_at,
      description,
      payee_id,
      project_id,
      approval_status,
      payees (
        payee_name
      ),
      projects (
        project_number,
        project_name
      )
    `)
    .eq('id', receiptId)
    .single();

  if (error) {
    console.error('Error fetching linked receipt:', error);
    return null;
  }

  return {
    id: data.id,
    image_url: data.image_url,
    amount: data.amount,
    captured_at: data.captured_at,
    description: data.description,
    payee_id: data.payee_id,
    payee_name: (data.payees as any)?.payee_name || null,
    project_id: data.project_id,
    project_number: (data.projects as any)?.project_number || null,
    project_name: (data.projects as any)?.project_name || null,
    approval_status: data.approval_status,
  };
}

