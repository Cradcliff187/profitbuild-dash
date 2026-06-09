import React from 'react';
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

export interface SearchFilters {
  searchText: string;
  status: string[];
  projectType: string;
  clientName: string[];
  projectName: string[];
  categories: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  hasVersions: boolean | null;
}

interface EstimateSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  resultCount?: number;
  clients: Array<{ id: string; client_name: string; }>;
  projects: Array<{ id: string; project_name: string; project_number: string; }>;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
];

const CATEGORY_OPTIONS = [
  { value: 'labor_internal', label: 'Labor (Internal)' },
  { value: 'subcontractors', label: 'Subcontractors' },
  { value: 'materials', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'permits', label: 'Permits & Fees' },
  { value: 'management', label: 'Management' },
  { value: 'other', label: 'Other' }
];

export const EstimateSearchFilters: React.FC<EstimateSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  clients,
  projects
}) => {
  const fields: FilterFieldDef[] = [
    {
      kind: "search",
      key: "searchText",
      placeholder: "Search estimates, projects, clients...",
    },
    { kind: "multiSelect", key: "status", label: "Status", options: STATUS_OPTIONS },
    {
      kind: "multiSelect",
      key: "clientName",
      label: "Client",
      searchable: true,
      searchPlaceholder: "Search clients...",
      options: clients.map((c) => ({ value: c.client_name, label: c.client_name })),
    },
    {
      kind: "multiSelect",
      key: "projectName",
      label: "Project",
      searchable: true,
      searchPlaceholder: "Search projects...",
      options: projects.map((p) => ({
        value: p.project_name,
        label: `${p.project_number} - ${p.project_name}`,
      })),
    },
    { kind: "multiSelect", key: "categories", label: "Category", options: CATEGORY_OPTIONS },
    {
      kind: "select",
      key: "hasVersions",
      label: "Versions",
      allLabel: "All estimates",
      options: [
        { value: "true", label: "Multiple versions" },
        { value: "false", label: "Single version" },
      ],
    },
    { kind: "dateRange", key: "dateRange", label: "Date" },
    { kind: "numberRange", key: "amountRange", label: "Amount", prefix: "$" },
  ];

  // `hasVersions` is boolean|null on the filter state but a string|null select in the bar.
  const valuesForBar: FilterValues = {
    ...filters,
    hasVersions: filters.hasVersions === null ? null : String(filters.hasVersions),
  };

  const handleChange = (patch: FilterValues) => {
    const next = { ...patch } as Record<string, unknown>;
    if ("hasVersions" in next) {
      next.hasVersions =
        next.hasVersions === null || next.hasVersions === undefined
          ? null
          : next.hasVersions === "true";
    }
    onFiltersChange({ ...filters, ...next } as SearchFilters);
  };

  return (
    <EntityFilterBar
      entityName="Estimates"
      fields={fields}
      values={valuesForBar}
      onChange={handleChange}
      onClearAll={onReset}
      resultCount={resultCount}
    />
  );
};
