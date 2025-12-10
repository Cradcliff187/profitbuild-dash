# Page Header Component Implementation

## Overview
Create a reusable `PageHeader` component to provide consistent visual anchoring across all main pages. The header features a white background, subtle shadow, and optional orange accent line.

**IMPORTANT:** Do NOT modify any Time Tracker pages or components.

---

## Design Specification

```
┌─────────────────────────────────────────────────────────────────┐
│  [Icon]  Page Title                              [Actions]      │  bg-white
│          Description text                                       │  
├─────────────────────────────────────────────────────────────────┤  border-b
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  orange accent (2px)
│                                                                 │
│  Page content (bg-slate-50/50)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Creation

### File: `src/components/ui/page-header.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  showAccent?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  children,
  showAccent = true,
}: PageHeaderProps) {
  return (
    <div className={cn("bg-white border-b border-slate-200 shadow-sm", className)}>
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Icon + Title + Description */}
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Actions */}
          {actions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Optional children for additional header content (filters, tabs, etc.) */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>

      {/* Orange accent line */}
      {showAccent && (
        <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400" />
      )}
    </div>
  );
}
```

---

## Page Updates

### Pages to Update (with example implementations)

Each page needs to:
1. Import `PageHeader`
2. Replace existing header markup with `PageHeader` component
3. Move any action buttons to the `actions` prop

---

### 1. Dashboard (`src/pages/Dashboard.tsx`)

**Before:**
```tsx
<div className="space-y-2">
  <div className="flex items-center space-x-3">
    <LayoutDashboard className="h-5 w-5 text-primary" />
    <div>
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <p className="text-muted-foreground">Overview of projects and activities</p>
    </div>
  </div>
  {/* ... rest of dashboard header ... */}
</div>
```

**After:**
```tsx
import { PageHeader } from "@/components/ui/page-header";
import { LayoutDashboard } from "lucide-react";

// In the component:
<PageHeader
  icon={LayoutDashboard}
  title="Dashboard"
  description="Overview of projects and activities"
  actions={
    <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing}>
      <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
      Refresh
    </Button>
  }
/>
```

---

### 2. Projects (`src/pages/Projects.tsx`)

**After:**
```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Building2 } from "lucide-react";

<PageHeader
  icon={Building2}
  title="Projects"
  description="Manage construction projects and track financials"
  actions={
    <>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>
    </>
  }
/>
```

---

### 3. Estimates (`src/pages/Estimates.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Calculator } from "lucide-react";

<PageHeader
  icon={Calculator}
  title="Estimates"
  description="Create and manage project estimates"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      New Estimate
    </Button>
  }
/>
```

---

### 4. Quotes (`src/pages/Quotes.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { FileText } from "lucide-react";

<PageHeader
  icon={FileText}
  title="Quotes"
  description="Manage customer quotes and proposals"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      New Quote
    </Button>
  }
/>
```

---

### 5. Bids (`src/pages/BranchBids.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Package } from "lucide-react";

<PageHeader
  icon={Package}
  title="Bids"
  description="Track and manage project bids"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      New Bid
    </Button>
  }
/>
```

---

### 6. Work Orders (`src/pages/WorkOrders.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Wrench } from "lucide-react";

<PageHeader
  icon={Wrench}
  title="Work Orders"
  description="Manage work orders and assignments"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      New Work Order
    </Button>
  }
/>
```

---

### 7. Expenses & Invoices (`src/pages/Expenses.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Receipt } from "lucide-react";

<PageHeader
  icon={Receipt}
  title="Expenses & Invoices"
  description="Track expenses, invoices, and financial transactions"
  actions={
    <>
      <Button variant="outline" size="sm">
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Expense
      </Button>
    </>
  }
/>
```

---

### 8. Profit Analysis (`src/pages/ProfitAnalysis.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { TrendingUp } from "lucide-react";

<PageHeader
  icon={TrendingUp}
  title="Profit Analysis"
  description="Analyze project profitability and margins"
/>
```

---

### 9. Reports (`src/pages/Reports.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { BarChart3 } from "lucide-react";

<PageHeader
  icon={BarChart3}
  title="Reports"
  description="Generate and view business reports"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      New Report
    </Button>
  }
>
  {/* Category tabs can go as children */}
  <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
    <TabsList>
      {/* ... tabs ... */}
    </TabsList>
  </Tabs>
</PageHeader>
```

---

### 10. Clients (`src/pages/Clients.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { UserCheck } from "lucide-react";

<PageHeader
  icon={UserCheck}
  title="Clients"
  description="Manage client information and contacts"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add Client
    </Button>
  }
/>
```

---

### 11. Payees (`src/pages/Payees.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Users } from "lucide-react";

<PageHeader
  icon={Users}
  title="Payees"
  description="Manage vendors, subcontractors, and payees"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add Payee
    </Button>
  }
/>
```

---

### 12. Field Media (`src/pages/FieldMedia.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Camera } from "lucide-react";

<PageHeader
  icon={Camera}
  title="Field Media"
  description="View and manage field photos and videos"
  actions={
    <>
      <Button variant="outline" size="sm">
        <Camera className="h-4 w-4 mr-2" />
        Capture Photo
      </Button>
      <Button size="sm">
        <Video className="h-4 w-4 mr-2" />
        Capture Video
      </Button>
    </>
  }
/>
```

---

### 13. Settings (`src/pages/Settings.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Settings as SettingsIcon } from "lucide-react";

<PageHeader
  icon={SettingsIcon}
  title="Settings"
  description="Manage your account and application preferences"
/>
```

---

### 14. Role Management (`src/pages/RoleManagement.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Shield } from "lucide-react";

<PageHeader
  icon={Shield}
  title="Role Management"
  description="Manage user roles and permissions"
/>
```

---

### 15. Send SMS (`src/pages/SendSMS.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { MessageSquare } from "lucide-react";

<PageHeader
  icon={MessageSquare}
  title="Send SMS"
  description="Send SMS notifications to team members"
/>
```

---

### 16. KPI Guide (`src/pages/KPIGuide.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { BookOpen } from "lucide-react";

<PageHeader
  icon={BookOpen}
  title="KPI Guide"
  description="Understanding key performance indicators"
/>
```

---

### 17. My Training (`src/pages/MyTraining.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { GraduationCap } from "lucide-react";

<PageHeader
  icon={GraduationCap}
  title="My Training"
  description="View and complete training modules"
/>
```

---

### 18. Training Admin (`src/pages/TrainingAdmin.tsx`)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { GraduationCap } from "lucide-react";

<PageHeader
  icon={GraduationCap}
  title="Training Admin"
  description="Manage training content and assignments"
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add Module
    </Button>
  }
/>
```

---

## Files to NOT Modify

| File | Reason |
|------|--------|
| `src/pages/TimeTracker.tsx` | Excluded |
| `src/pages/TimeEntries.tsx` | Excluded |
| `src/components/time-tracker/*` | Excluded |
| `src/components/MobileTimeTracker.tsx` | Excluded |

---

## Page Layout Pattern

After adding PageHeader, each page should follow this structure:

```tsx
export default function ExamplePage() {
  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <PageHeader
        icon={ExampleIcon}
        title="Page Title"
        description="Page description"
        actions={<Button>Action</Button>}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Page content here */}
      </div>
    </div>
  );
}
```

---

## Implementation Order

1. Create `src/components/ui/page-header.tsx`
2. Update Dashboard (most visible, good test)
3. Update Projects page
4. Update Settings page
5. Update remaining pages alphabetically
6. Verify all pages have consistent headers
7. Test mobile responsiveness

---

## Verification Checklist

- [ ] PageHeader component created at `src/components/ui/page-header.tsx`
- [ ] Dashboard has PageHeader with refresh action
- [ ] Projects has PageHeader with New Project action
- [ ] Estimates has PageHeader
- [ ] Quotes has PageHeader
- [ ] Bids has PageHeader
- [ ] Work Orders has PageHeader
- [ ] Expenses has PageHeader with Import + Add actions
- [ ] Profit Analysis has PageHeader
- [ ] Reports has PageHeader with tabs as children
- [ ] Clients has PageHeader
- [ ] Payees has PageHeader
- [ ] Field Media has PageHeader
- [ ] Settings has PageHeader
- [ ] Role Management has PageHeader
- [ ] Send SMS has PageHeader
- [ ] KPI Guide has PageHeader
- [ ] My Training has PageHeader
- [ ] Training Admin has PageHeader
- [ ] Orange accent line appears on all headers
- [ ] Actions align to the right
- [ ] Mobile responsive (stacks properly)
- [ ] Time Tracker pages are UNCHANGED

---

## Optional Enhancements (Future)

1. **Breadcrumbs support** - Add optional breadcrumb prop
2. **Sticky header** - Add `sticky top-0 z-10` option
3. **Loading state** - Skeleton variant for page transitions
4. **Back button** - Optional back navigation for detail pages
