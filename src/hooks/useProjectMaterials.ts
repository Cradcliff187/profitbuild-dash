import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProcurementStatus =
  | 'not_ordered'
  | 'ordered'
  | 'in_production'
  | 'shipped'
  | 'delivered';

export interface ProjectMaterial {
  id: string;
  description: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  procurementStatus: ProcurementStatus;
  expectedDeliveryDate: string | null;
  needByDate: string | null;
  isLongLead: boolean;
  isChangeOrder: boolean;
  changeOrderNumber?: string;
}

export interface MaterialProcurementPatch {
  procurement_status?: ProcurementStatus;
  expected_delivery_date?: string | null;
  need_by_date?: string | null;
  is_long_lead?: boolean;
}

const LINE_ITEM_FIELDS =
  'id, category, description, quantity, cost_per_unit, total_cost, procurement_status, expected_delivery_date, need_by_date, is_long_lead';

interface RawMaterialLineItem {
  id: string;
  category: string | null;
  description: string | null;
  quantity: number | null;
  cost_per_unit: number | null;
  total_cost: number | null;
  procurement_status: string | null;
  expected_delivery_date: string | null;
  need_by_date: string | null;
  is_long_lead: boolean | null;
}

interface RawChangeOrder {
  id: string;
  change_order_number: string | null;
  change_order_line_items: RawMaterialLineItem[] | null;
}

function mapRow(
  item: RawMaterialLineItem,
  isChangeOrder: boolean,
  coNumber?: string
): ProjectMaterial {
  return {
    id: item.id,
    description: item.description ?? '',
    quantity: Number(item.quantity) || 0,
    costPerUnit: Number(item.cost_per_unit) || 0,
    totalCost: Number(item.total_cost) || 0,
    procurementStatus: (item.procurement_status as ProcurementStatus) || 'not_ordered',
    expectedDeliveryDate: item.expected_delivery_date || null,
    needByDate: item.need_by_date || null,
    isLongLead: !!item.is_long_lead,
    isChangeOrder,
    changeOrderNumber: coNumber,
  };
}

/**
 * Materials & procurement for a project.
 *
 * Source of truth is the approved current estimate's `materials` line items
 * plus any approved change orders' `materials` lines — the same scoping the
 * schedule loaders use. Materials are intentionally NOT on the Gantt (they are
 * procurement, not work activities); this hook backs the dedicated Materials
 * surface where each item carries a need-by date, expected delivery date,
 * procurement status, and a long-lead flag (real columns on the line-item
 * tables — see migration add_material_procurement_tracking).
 */
export function useProjectMaterials(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['project-materials', projectId];

  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectMaterial[]> => {
      // Approved estimate (latest) + its line items
      const { data: estimate, error: estError } = await supabase
        .from('estimates')
        .select(`id, estimate_line_items (${LINE_ITEM_FIELDS})`)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('date_created', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (estError) throw estError;

      // Approved change orders + their line items
      const { data: changeOrders, error: coError } = await supabase
        .from('change_orders')
        .select(`id, change_order_number, change_order_line_items (${LINE_ITEM_FIELDS})`)
        .eq('project_id', projectId)
        .eq('status', 'approved');
      if (coError) throw coError;

      const estimateLines = ((estimate?.estimate_line_items as RawMaterialLineItem[]) || []);
      const estimateMaterials = estimateLines
        .filter((li) => li.category === 'materials')
        .map((li) => mapRow(li, false));

      const coMaterials = ((changeOrders as RawChangeOrder[]) || []).flatMap((co) =>
        (co.change_order_line_items || [])
          .filter((li) => li.category === 'materials')
          .map((li) => mapRow(li, true, co.change_order_number ?? undefined))
      );

      return [...estimateMaterials, ...coMaterials];
    },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({
      id,
      isChangeOrder,
      patch,
    }: {
      id: string;
      isChangeOrder: boolean;
      patch: MaterialProcurementPatch;
    }) => {
      const table = isChangeOrder ? 'change_order_line_items' : 'estimate_line_items';
      const { error } = await supabase.from(table).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Material updated');
    },
    onError: (error) => {
      console.error('Error updating material:', error);
      toast.error('Failed to update material');
    },
  });

  return {
    materials: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    updateMaterial: updateMaterial.mutateAsync,
    isUpdating: updateMaterial.isPending,
  };
}
