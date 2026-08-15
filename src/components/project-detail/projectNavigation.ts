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
  /**
   * `/projects/:id/schedule` serves TWO different screens (Rule 18 — one URL,
   * two layouts): a Gantt on desktop, and the field project hub on mobile. The
   * Gantt really is a schedule; the hub is the whole job — tasks, photos,
   * drawings, materials, notes — with the schedule as one row inside it. So on
   * mobile the label follows the LAYOUT, not the URL, and calling it "Schedule"
   * there would mean Schedule contains Schedule.
   */
  isMobile?: boolean;
}

/** Mobile label for the `schedule` section. See NavigationOptions.isMobile. */
const FIELD_HUB_LABEL = 'Job';

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
    groups[0].items.push({
      title: options.isMobile ? FIELD_HUB_LABEL : "Schedule",
      url: "schedule",
      icon: Calendar,
      fieldWorkerSafe: true,
    });
  }

  // Add AIA Billing if feature flag is enabled
  if (isFeatureEnabled("aiaBilling")) {
    groups[1].items.push({ title: "Billing (AIA)", url: "billing", icon: Receipt });
  }

  // Mobile: the Job hub IS the project home — /projects/:id redirects to it
  // (ProjectOverviewRoute), so an "Overview" entry here would just navigate
  // into a redirect. Drop it; the hub's money pulse + Manage rows carry what
  // the mobile Overview used to show. Desktop keeps Overview unchanged.
  // Gated on the SAME flag as the redirect: with scheduleView off there is no
  // hub, Overview renders normally, and dropping it here would leave mobile
  // users with no nav path back to the project home.
  if (options.isMobile && isFeatureEnabled("scheduleView")) {
    groups[0] = {
      ...groups[0],
      items: groups[0].items.filter((item) => item.url !== ""),
    };
  }

  if (options.isFieldWorker) {
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.fieldWorkerSafe) }))
      .filter((group) => group.items.length > 0);
  }

  return groups.filter((group) => group.items.length > 0);
};

// Helper: Get section display label from URL segment. Pass `isMobile` so the
// `schedule` section reads "Job" on the field hub — must stay in lockstep with
// getNavigationGroups, or the selector pill and the nav sheet disagree.
export const getSectionLabel = (section: string, isMobile = false): string => {
  const labels: Record<string, string> = {
    '': 'Overview',
    'overview': 'Overview',
    'estimates': 'Estimates & Quotes',
    'changes': 'Change Orders',
    'expenses': 'Expenses',
    'control': 'Cost Tracking',
    'documents': 'Documents',
    'schedule': isMobile ? FIELD_HUB_LABEL : 'Schedule',
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
