import React from "react";
import { ProjectStatus, PROJECT_STATUSES, JOB_TYPES } from "@/types/project";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

export interface WorkOrderSearchFilters {
  searchText: string;
  status: ProjectStatus[];
  jobType: string[];
  clientName: string[];
  hasEstimate: boolean | null; // null = all, true = has estimate, false = no estimate
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  sortBy: 'name' | 'date' | 'status';
  sortOrder: 'asc' | 'desc';
}

interface WorkOrderFiltersProps {
  filters: WorkOrderSearchFilters;
  onFiltersChange: (filters: WorkOrderSearchFilters) => void;
  resultCount?: number;
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
  clients: Array<{ id: string; client_name: string; }>;
}

export const WorkOrderFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: WorkOrderFiltersProps) => {
  const fields: FilterFieldDef[] = [
    {
      kind: "search",
      key: "searchText",
      placeholder: "Search work orders, clients, addresses...",
    },
    {
      kind: "multiSelect",
      key: "status",
      label: "Status",
      options: PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    },
    {
      kind: "multiSelect",
      key: "jobType",
      label: "Job Type",
      options: JOB_TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      kind: "multiSelect",
      key: "clientName",
      label: "Client",
      searchable: true,
      searchPlaceholder: "Search clients...",
      options: clients.map((c) => ({ value: c.client_name, label: c.client_name })),
    },
    {
      kind: "select",
      key: "hasEstimate",
      label: "Estimate",
      allLabel: "All",
      options: [
        { value: "true", label: "Has Estimate" },
        { value: "false", label: "No Estimate" },
      ],
    },
    { kind: "dateRange", key: "dateRange", label: "Date" },
  ];

  const valuesForBar: FilterValues = {
    ...filters,
    hasEstimate: filters.hasEstimate === null ? null : String(filters.hasEstimate),
  };

  const handleChange = (patch: FilterValues) => {
    const next = { ...patch } as Record<string, unknown>;
    if ("hasEstimate" in next) {
      next.hasEstimate =
        next.hasEstimate === null || next.hasEstimate === undefined
          ? null
          : next.hasEstimate === "true";
    }
    onFiltersChange({ ...filters, ...next } as WorkOrderSearchFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
      searchText: "",
      status: [],
      jobType: [],
      clientName: [],
      hasEstimate: null,
      dateRange: { start: null, end: null },
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  return (
    <EntityFilterBar
      entityName="Work Orders"
      fields={fields}
      values={valuesForBar}
      onChange={handleChange}
      onClearAll={handleClearAll}
      resultCount={resultCount}
      actions={
        (leftActions || actions) ? (
          <>
            {leftActions}
            {actions}
          </>
        ) : undefined
      }
    />
  );
};
