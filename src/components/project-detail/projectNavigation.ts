import { Building2, FileText, FileEdit, DollarSign, Target, Calendar, Edit, Receipt } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/featureFlags';

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  // When true, this section is reachable for field workers. AppLayout's
  // role-guard currently only allows /projects/:id/schedule for that role, so
  // any NavItem that points elsewhere would just bounce them back to
  // /time-tracker. Keep this flag in sync with the guard.
  fieldWorkerSafe?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavigationOptions {
  isFieldWorker?: boolean;
}

export const getNavigationGroups = (options: NavigationOptions = {}): NavGroup[] => {
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

  // Add Schedule if feature flag is enabled. This is the one project-scoped
  // route field workers can reach, so it gets fieldWorkerSafe.
  if (isFeatureEnabled("scheduleView")) {
    groups[0].items.push({ title: "Schedule", url: "schedule", icon: Calendar, fieldWorkerSafe: true });
  }

  // Add AIA Billing if feature flag is enabled
  if (isFeatureEnabled("aiaBilling")) {
    groups[1].items.push({ title: "Billing (AIA)", url: "billing", icon: Receipt });
  }

  if (options.isFieldWorker) {
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.fieldWorkerSafe) }))
      .filter((group) => group.items.length > 0);
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
    'billing': 'Billing (AIA)',
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
    'billing': Receipt,
    'edit': Edit,
  };
  return icons[section] || Building2;
};
