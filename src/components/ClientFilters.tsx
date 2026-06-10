import { ClientType, CLIENT_TYPES } from "@/types/client";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

interface ClientFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: ClientType | "all";
  onTypeFilterChange: (value: ClientType | "all") => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (value: "all" | "active" | "inactive") => void;
  resultCount?: number;
}

export const ClientFilters = ({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  resultCount,
}: ClientFiltersProps) => {
  const fields: FilterFieldDef[] = [
    { kind: "search", key: "searchTerm", placeholder: "Search clients..." },
    {
      kind: "select",
      key: "typeFilter",
      label: "Type",
      allLabel: "All Types",
      options: CLIENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
    },
    {
      kind: "select",
      key: "statusFilter",
      label: "Status",
      allLabel: "All Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const values: FilterValues = {
    searchTerm,
    typeFilter: typeFilter === "all" ? null : typeFilter,
    statusFilter: statusFilter === "all" ? null : statusFilter,
  };

  const handleChange = (patch: FilterValues) => {
    if ("searchTerm" in patch) onSearchChange((patch.searchTerm as string) ?? "");
    if ("typeFilter" in patch)
      onTypeFilterChange((patch.typeFilter as ClientType | null) ?? "all");
    if ("statusFilter" in patch)
      onStatusFilterChange((patch.statusFilter as "active" | "inactive" | null) ?? "all");
  };

  const handleClearAll = () => {
    onSearchChange("");
    onTypeFilterChange("all");
    onStatusFilterChange("all");
  };

  return (
    <EntityFilterBar
      entityName="Clients"
      fields={fields}
      values={values}
      onChange={handleChange}
      onClearAll={handleClearAll}
      resultCount={resultCount}
    />
  );
};
