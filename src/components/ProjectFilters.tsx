import React from "react";
import { ProjectStatus, PROJECT_STATUSES, JOB_TYPES } from "@/types/project";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

export interface ProjectSearchFilters {
  searchText: string;
  status: ProjectStatus[];
  jobType: string[];
  clientName: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  budgetRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: 'name' | 'date' | 'status' | 'margin';
  sortOrder: 'asc' | 'desc';
}

interface ProjectFiltersProps {
  filters: ProjectSearchFilters;
  onFiltersChange: (filters: ProjectSearchFilters) => void;
  resultCount?: number;
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
  clients: Array<{ id: string; client_name: string; }>;
}

export const ProjectFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: ProjectFiltersProps) => {
  const fields: FilterFieldDef[] = [
    {
      kind: "search",
      key: "searchText",
      placeholder: "Search projects, clients, addresses...",
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
    { kind: "dateRange", key: "dateRange", label: "Date" },
    { kind: "numberRange", key: "budgetRange", label: "Budget", prefix: "$" },
  ];

  const handleChange = (patch: FilterValues) => {
    onFiltersChange({ ...filters, ...patch } as ProjectSearchFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
      searchText: "",
      status: [],
      jobType: [],
      clientName: [],
      dateRange: { start: null, end: null },
      budgetRange: { min: null, max: null },
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  return (
    <EntityFilterBar
      entityName="Projects"
      fields={fields}
      values={filters as unknown as FilterValues}
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
