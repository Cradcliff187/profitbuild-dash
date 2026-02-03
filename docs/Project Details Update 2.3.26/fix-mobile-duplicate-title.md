# Fix: Remove Duplicate Page Title on Mobile

## Problem

On mobile, every page displays the page title **twice**:

1. **AppLayout mobile header** (`src/components/AppLayout.tsx`) — a dark slate-900 bar at the top showing the logo, page title via `getPageTitle()`, and hamburger menu
2. **PageHeader component** (`src/components/ui/page-header.tsx`) — a white card inside each page showing icon, title, description, and action buttons

This wastes ~120px of vertical viewport before any actionable content appears. On a construction app used on job sites, screen real estate is critical.

## Solution

Hide the **title/icon/description row** inside `PageHeader` on mobile (`< 768px`). The AppLayout mobile header already provides page identification. Keep the accent line and any children content visible.

## Scope of Change

### Files Modified (2 files)

#### 1. `src/components/ui/page-header.tsx` (PRIMARY CHANGE)

**Current code:**
```tsx
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
    <div className={cn("bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4 lg:mb-3", className)}>
      <div className="px-3 sm:px-6 lg:px-4 py-4 lg:py-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
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
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:flex-shrink-0">
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

**New code:**
```tsx
import { useIsMobile } from "@/hooks/use-mobile";

// Add to interface (no changes to existing props):
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
  const isMobile = useIsMobile();

  // On mobile: AppLayout header already shows the page title.
  // Only render the accent line and any children content.
  // The title, icon, description, and actions (which are already
  // hidden via "hidden sm:flex" on individual pages) are suppressed.
  if (isMobile && !children) {
    return (
      <>
        {showAccent && (
          <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400 mb-3" />
        )}
      </>
    );
  }

  if (isMobile && children) {
    return (
      <div className={cn("bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4", className)}>
        <div className="px-3 py-3">
          {children}
        </div>
        {showAccent && (
          <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400" />
        )}
      </div>
    );
  }

  // Desktop: render everything as before (NO CHANGES to desktop behavior)
  return (
    <div className={cn("bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4 lg:mb-3", className)}>
      <div className="px-3 sm:px-6 lg:px-4 py-4 lg:py-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
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
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Optional children for additional header content */}
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

#### 2. `src/components/AppLayout.tsx` (MINOR TWEAK — optional but recommended)

The mobile header currently has no bottom accent. For visual consistency, add the orange accent line to the mobile header to replace the one PageHeader previously provided.

**Find this block:**
```tsx
{isMobile && (
  <header className="flex h-16 items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 lg:hidden shadow-sm">
```

**Change to:**
```tsx
{isMobile && (
  <header className="flex flex-col lg:hidden shadow-sm">
    <div className="flex h-16 items-center gap-3 border-b border-slate-700 bg-slate-900 px-4">
```

And close the new wrapper after the existing `</header>` closing content, adding:
```tsx
    </div>
    <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400" />
  </header>
)}
```

This moves the accent line to the single source of truth — the app-level mobile header.

## Files NOT Modified (zero-risk confirmation)

The following pages use `PageHeader` and require **NO changes** — they all already follow the pattern of hiding action buttons on mobile with `className="hidden sm:flex"` and using a FAB button for mobile:

| Page | File | Actions Pattern | Mobile FAB |
|------|------|----------------|------------|
| Dashboard | `src/pages/Dashboard.tsx` | `hidden sm:flex` | No (refresh only) |
| Projects | `src/pages/Projects.tsx` | `hidden sm:flex` | Yes |
| Work Orders | `src/pages/WorkOrders.tsx` | `hidden sm:flex` | Yes |
| Estimates | `src/pages/Estimates.tsx` | `hidden sm:flex` | Yes |
| Quotes | `src/pages/Quotes.tsx` | `hidden sm:flex` | Yes |
| Expenses | `src/pages/Expenses.tsx` | `hidden sm:flex` | Yes |
| Clients | `src/pages/Clients.tsx` | `hidden sm:flex` | Yes |
| Payees | `src/pages/Payees.tsx` | `hidden sm:flex` | Yes |
| Reports | `src/pages/Reports.tsx` | `hidden sm:flex` | No |
| Training | `src/pages/Training.tsx` | No actions | No |
| Role Management | `src/pages/RoleManagement.tsx` | Has actions | No |
| Profit Analysis | `src/pages/ProfitAnalysis.tsx` | `hidden sm:flex` | No |
| Settings | `src/pages/Settings.tsx` | No actions | No |

**CRITICAL**: No page currently passes `children` to `PageHeader`, so the `isMobile && children` branch is purely defensive/future-proof. However, the code handles it correctly if a page ever does.

## What This Does NOT Affect

- **Desktop view**: Completely unchanged. The `isMobile` check only applies below 768px.
- **ProjectDetailView**: Uses its own custom mobile header pattern (not PageHeader), so unaffected.
- **MobilePageWrapper**: No changes needed.
- **MobileResponsiveHeader**: Separate component, not affected.
- **AppSidebar**: No changes needed.
- **Routing**: No changes.
- **Database/API**: No changes.

## Verification Checklist

After implementation, verify on mobile viewport (< 768px):

- [ ] Each page shows title ONLY in the dark slate AppLayout header bar
- [ ] Orange accent line appears (either from AppLayout or PageHeader)
- [ ] No duplicate "Work Orders" / "Projects" / "Estimates" etc.
- [ ] Desktop view (> 768px) is completely unchanged — full PageHeader visible
- [ ] FAB buttons still work on all pages that have them
- [ ] Pull-to-refresh still works on pages that support it
- [ ] Pages with no actions still render correctly on mobile

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Desktop layout breaks | `isMobile` hook only triggers < 768px; desktop path is unchanged code |
| Page with children breaks | Defensive `isMobile && children` branch preserves children rendering |
| Action buttons disappear | All pages already use `hidden sm:flex` on actions; no change needed |
| Accent line missing | Explicitly rendered in both mobile paths |
| `useIsMobile` import fails | Hook already exists at `@/hooks/use-mobile` and is used across the app |
