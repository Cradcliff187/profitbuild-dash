import { ProcurementStatus } from '@/hooks/useProjectMaterials';

export const PROCUREMENT_STATUS_ORDER: ProcurementStatus[] = [
  'not_ordered',
  'ordered',
  'in_production',
  'shipped',
  'delivered',
];

export const PROCUREMENT_STATUS_META: Record<
  ProcurementStatus,
  { label: string; badgeClasses: string }
> = {
  not_ordered: {
    label: 'Not ordered',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  ordered: {
    label: 'Ordered',
    badgeClasses: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  in_production: {
    label: 'In production',
    badgeClasses: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  shipped: {
    label: 'Shipped',
    badgeClasses: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  delivered: {
    label: 'Delivered',
    badgeClasses: 'bg-green-100 text-green-800 border-green-200',
  },
};
