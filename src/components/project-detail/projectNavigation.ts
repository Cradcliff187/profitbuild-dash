import { Building2, FileText, FileEdit, DollarSign, Target, Calendar, Edit } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/featureFlags';

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const getNavigationGroups = (): NavGroup[] => {
  const groups: NavGroup[] = [
    {
      label: "PROJECT INFO",
      items: [
        { title: "Overview", url: "", icon: Building2 },
      ],
    },
    {
      label: "COST MANAGEMENT",
      items: [
        { title: "Expenses", url: "expenses", icon: DollarSign },
        { title: "Cost Tracking", url: "control", icon: Target },
      ],
    },
    {
      label: "CONTRACTS & ESTIMATES",
      items: [
        { title: "Estimates & Quotes", url: "estimates", icon: FileText },
        { title: "Change Orders", url: "changes", icon: FileEdit },
      ],
    },
    {
      label: "DOCUMENTATION",
      items: [
        { title: "Documents", url: "documents", icon: FileText },
      ],
    },
  ];

  // Add Schedule if feature flag is enabled
  if (isFeatureEnabled("scheduleView")) {
    groups[0].items.push({ title: "Schedule", url: "schedule", icon: Calendar });
  }

  return groups;
};

// Helper: Get section display label from URL segment
export const getSectionLabel = (section: string): string => {
  const labels: Record<string, string> = {
    '': 'Overview',
    'overview': 'Overview',
    'estimates': 'Estimates & Quotes',
    'changes': 'Change Orders',
    'expenses': 'Expenses',
    'control': 'Cost Tracking',
    'documents': 'Documents',
    'schedule': 'Schedule',
    'edit': 'Edit Project',
  };
  return labels[section] || 'Overview';
};

// Helper: Get section icon from URL segment
export const getSectionIcon = (section: string) => {
  const icons: Record<string, typeof Building2> = {
    '': Building2,
    'overview': Building2,
    'estimates': FileText,
    'changes': FileEdit,
    'expenses': DollarSign,
    'control': Target,
    'documents': FileText,
    'schedule': Calendar,
    'edit': Edit,
  };
  return icons[section] || Building2;
};
