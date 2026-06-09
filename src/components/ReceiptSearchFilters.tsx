import React from 'react';
import { format } from "date-fns";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues, DateRangeValue } from "@/components/filters/filterTypes";

export interface ReceiptFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: string[];
  payeeIds: string[];
  projectIds: string[];
  submittedBy: string[];
  amount: string | null;
}

interface ReceiptSearchFiltersProps {
  filters: ReceiptFilters;
  onFiltersChange: (filters: ReceiptFilters) => void;
  onReset: () => void;
  resultCount?: number;
  payees: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; number: string; name: string }>;
  submitters?: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const parseISO = (iso: string | null): Date | null => (iso ? new Date(`${iso}T00:00:00`) : null);

export const ReceiptSearchFilters: React.FC<ReceiptSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  payees,
  projects,
  submitters = []
}) => {
  const fields: FilterFieldDef[] = [
    { kind: "multiSelect", key: "status", label: "Status", options: STATUS_OPTIONS },
    {
      kind: "multiSelect",
      key: "payeeIds",
      label: "Payee",
      searchable: true,
      searchPlaceholder: "Search payees...",
      options: payees.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      kind: "multiSelect",
      key: "projectIds",
      label: "Project",
      searchable: true,
      searchPlaceholder: "Search projects...",
      options: projects.map((p) => ({ value: p.id, label: `${p.number} - ${p.name}` })),
    },
    ...(submitters.length > 0
      ? [{
          kind: "multiSelect" as const,
          key: "submittedBy",
          label: "Submitted By",
          searchable: true,
          searchPlaceholder: "Search people...",
          options: submitters.map((s) => ({ value: s.id, label: s.name })),
        }]
      : []),
    { kind: "text", key: "amount", label: "Amount", placeholder: "Filter by amount..." },
    { kind: "dateRange", key: "dateRange", label: "Date" },
  ];

  const valuesForBar: FilterValues = {
    ...filters,
    amount: filters.amount ?? "",
    dateRange: { start: parseISO(filters.dateFrom), end: parseISO(filters.dateTo) },
  };

  const handleChange = (patch: FilterValues) => {
    const next = { ...patch } as Record<string, unknown>;
    if ("dateRange" in next) {
      const dr = next.dateRange as DateRangeValue;
      delete next.dateRange;
      next.dateFrom = dr.start ? format(dr.start, "yyyy-MM-dd") : null;
      next.dateTo = dr.end ? format(dr.end, "yyyy-MM-dd") : null;
    }
    if ("amount" in next) {
      next.amount = (next.amount as string) || null;
    }
    onFiltersChange({ ...filters, ...next } as ReceiptFilters);
  };

  return (
    <EntityFilterBar
      entityName="Receipts"
      fields={fields}
      values={valuesForBar}
      onChange={handleChange}
      onClearAll={onReset}
      resultCount={resultCount}
    />
  );
};
