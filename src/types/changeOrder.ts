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
  payee_id?: string | null;
  payee_name?: string;
  // When true, this line's COST draws down the project contingency reserve and
  // is NOT billed to the client (does not raise the contract). Default false =
  // additive billing. See Architectural Rule 26/contingency draw-down model.
  funded_by_contingency?: boolean;
  // Labor-cushion inputs (only meaningful on `labor_internal` lines). The DB
  // derives change_order_line_items.labor_cushion_amount as a GENERATED column
  // from these — mirrors estimate_line_items. Null on non-labor lines.
  labor_hours?: number | null;
  billing_rate_per_hour?: number | null;
  actual_cost_rate_per_hour?: number | null;
}

export const CHANGE_ORDER_LINE_ITEM_TEMPLATE: ChangeOrderLineItemInput = {
  category: 'materials',
  description: '',
  quantity: 1,
  unit: 'EA',
  cost_per_unit: 0,
  price_per_unit: 0,
  sort_order: 0,
  payee_id: null,
  funded_by_contingency: false,
};
