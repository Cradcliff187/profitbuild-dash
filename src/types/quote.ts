import { LineItemCategory } from "./estimate";

export interface QuoteLineItem {
  id: string;
  estimateLineItemId?: string; // Optional link to original estimate line
  category: LineItemCategory;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Quote {
  id: string;
  project_id: string; // Links to project
  estimate_id?: string; // Optional link to specific estimate
  projectName: string; // Copied from project
  client: string; // Copied from project
  payee_id: string; // Links to payee
  quotedBy: string; // Subcontractor name (derived from vendor)
  dateReceived: Date;
  quoteNumber: string;
  lineItems: QuoteLineItem[];
  subtotals: {
    labor: number;
    subcontractors: number;
    materials: number;
    equipment: number;
    other: number;
  };
  total: number;
  notes?: string;
  attachment_url?: string; // PDF attachment URL from Supabase storage
  createdAt: Date;
}

export interface ComparisonData {
  estimateTotal: number;
  quoteTotal: number;
  difference: number;
  percentageDiff: number;
  categoryComparisons: {
    [key in LineItemCategory]: {
      estimate: number;
      quote: number;
      difference: number;
      percentageDiff: number;
    }
  };
}