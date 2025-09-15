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
  estimateId: string; // Links to original estimate
  projectName: string; // Copied from estimate
  client: string; // Copied from estimate
  quotedBy: string; // Subcontractor name
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