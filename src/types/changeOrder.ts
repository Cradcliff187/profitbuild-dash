import { Database } from '@/integrations/supabase/types';

export type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];
export type ChangeOrderLineItem = Database['public']['Tables']['change_order_line_items']['Row'];

export interface ChangeOrderLineItemInput {
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  cost_per_unit: number;
  price_per_unit: number;
  sort_order?: number;
}

export const CHANGE_ORDER_LINE_ITEM_TEMPLATE: ChangeOrderLineItemInput = {
  category: 'materials',
  description: '',
  quantity: 1,
  unit: 'EA',
  cost_per_unit: 0,
  price_per_unit: 0,
  sort_order: 0,
};
