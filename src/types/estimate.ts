export interface LineItem {
  id: string;
  category: 'Labor' | 'Materials' | 'Equipment' | 'Other';
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Estimate {
  id: string;
  projectName: string;
  client: string;
  date: Date;
  estimateNumber: string;
  lineItems: LineItem[];
  subtotals: {
    labor: number;
    materials: number;
    equipment: number;
    other: number;
  };
  total: number;
  createdAt: Date;
}

export type LineItemCategory = LineItem['category'];