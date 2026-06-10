import React from 'react';
import { format } from "date-fns";
import { TimeEntryFilters } from "@/types/timeEntry";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues, DateRangeValue } from "@/components/filters/filterTypes";

interface TimeEntrySearchFiltersProps {
  filters: TimeEntryFilters;
  onFiltersChange: (filters: TimeEntryFilters) => void;
  onReset: () => void;
  resultCount?: number;
  workers: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; number: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const parseISO = (iso: string | null): Date | null => (iso ? new Date(`${iso}T00:00:00`) : null);

export const TimeEntrySearchFilters: React.FC<TimeEntrySearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  workers,
  projects
}) => {
  const fields: FilterFieldDef[] = [
    { kind: "multiSelect", key: "status", label: "Status", options: STATUS_OPTIONS },
    {
      kind: "multiSelect",
      key: "workerIds",
      label: "Worker",
      searchable: true,
      searchPlaceholder: "Search workers...",
      options: workers.map((w) => ({ value: w.id, label: w.name })),
    },
    {
      kind: "multiSelect",
      key: "projectIds",
      label: "Project",
      searchable: true,
      searchPlaceholder: "Search projects...",
      options: projects.map((p) => ({ value: p.id, label: `${p.number} - ${p.name}` })),
    },
    { kind: "dateRange", key: "dateRange", label: "Date" },
  ];

  const valuesForBar: FilterValues = {
    ...filters,
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
    onFiltersChange({ ...filters, ...next } as TimeEntryFilters);
  };

  return (
    <EntityFilterBar
      entityName="Time Entries"
      fields={fields}
      values={valuesForBar}
      onChange={handleChange}
      onClearAll={onReset}
      resultCount={resultCount}
    />
  );
};
