import { PayeeType } from "@/types/payee";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

interface PayeeFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  servicesFilter: string;
  onServicesFilterChange: (filter: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount?: number;
}

const getPayeeTypeLabel = (type: PayeeType): string => {
  switch (type) {
    case PayeeType.SUBCONTRACTOR: return "Subcontractor";
    case PayeeType.MATERIAL_SUPPLIER: return "Material Supplier";
    case PayeeType.EQUIPMENT_RENTAL: return "Equipment Rental";
    case PayeeType.INTERNAL_LABOR: return "Internal Labor";
    case PayeeType.MANAGEMENT: return "Management";
    case PayeeType.PERMIT_AUTHORITY: return "Permit Authority";
    case PayeeType.OTHER: return "Other";
    default: return type;
  }
};

const SERVICES_OPTIONS = [
  { value: "labor", label: "Provides Labor" },
  { value: "materials", label: "Provides Materials" },
  { value: "1099", label: "Requires 1099" },
  { value: "internal", label: "Internal" },
  { value: "permit_issuer", label: "Permit Issuer" },
];

export const PayeeFilters = ({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  servicesFilter,
  onServicesFilterChange,
  onClearFilters,
  resultCount,
}: PayeeFiltersProps) => {
  const fields: FilterFieldDef[] = [
    { kind: "search", key: "searchTerm", placeholder: "Search payees..." },
    {
      kind: "select",
      key: "selectedType",
      label: "Type",
      allLabel: "All Types",
      options: Object.values(PayeeType).map((t) => ({ value: t, label: getPayeeTypeLabel(t) })),
    },
    {
      kind: "select",
      key: "servicesFilter",
      label: "Services",
      allLabel: "All Services",
      options: SERVICES_OPTIONS,
    },
  ];

  const values: FilterValues = {
    searchTerm,
    selectedType: selectedType === "all" ? null : selectedType,
    servicesFilter: servicesFilter === "all" ? null : servicesFilter,
  };

  const handleChange = (patch: FilterValues) => {
    if ("searchTerm" in patch) onSearchChange((patch.searchTerm as string) ?? "");
    if ("selectedType" in patch) onTypeChange((patch.selectedType as string | null) ?? "all");
    if ("servicesFilter" in patch)
      onServicesFilterChange((patch.servicesFilter as string | null) ?? "all");
  };

  return (
    <EntityFilterBar
      entityName="Payees"
      fields={fields}
      values={values}
      onChange={handleChange}
      onClearAll={onClearFilters}
      resultCount={resultCount}
    />
  );
};
