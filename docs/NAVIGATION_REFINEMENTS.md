# Navigation Refinements - Phase 2

## Overview
Follow-up improvements to the navigation overhaul. The dual-sidebar structure is working, but needs polish.

---

## Issue 1: Main App Sidebar Missing Collapse

### Problem
The main AppSidebar (left-most) has no collapse/minimize button. Users cannot reclaim horizontal space.

### Solution
Add a collapse trigger to the AppSidebar header.

### Implementation

**File:** `src/components/AppSidebar.tsx`

```tsx
// Import SidebarTrigger if not already imported
import { 
  SidebarTrigger,
  // ... other imports
} from "@/components/ui/sidebar";
import { PanelLeftClose } from "lucide-react";

// Update SidebarHeader:
<SidebarHeader className="border-b px-3 py-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <img
        src="https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Large%20Icon%20Only.png"
        alt="RCG"
        className="h-7 w-7 shrink-0"
      />
      {!collapsed && (
        <span className="font-bold text-base text-primary">RCG Work</span>
      )}
    </div>
    {!collapsed && (
      <SidebarTrigger className="h-7 w-7 text-muted-foreground hover:text-foreground" />
    )}
  </div>
</SidebarHeader>
```

**When collapsed**, the trigger should appear differently - add a floating trigger or rail:

```tsx
// Add SidebarRail for collapsed state expand trigger
import { SidebarRail } from "@/components/ui/sidebar";

// Inside the Sidebar component, add:
<SidebarRail />
```

The SidebarRail provides a hover-activated expand zone on the edge of the collapsed sidebar.

---

## Issue 2: Redundant Project Header/Breadcrumb

### Problem
The project details page shows redundant information:
- Breadcrumb: "Projects > 225-056 - 225-056 UC Additional Victory Parkway JC Work"
- Dropdown: "225-056 - 225-056 UC Additional Vict..."
- Both show the same project name

### Solution
Simplify the header. Remove the verbose breadcrumb since:
1. "Back to Projects" button already provides navigation
2. Project dropdown shows current project
3. Client name and status badge provide context

### Implementation

**File:** `src/components/ProjectDetailView.tsx` (or wherever the project header is)

**Before:**
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>{project.project_number} - {project.name}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

**After - Option A (Minimal):**
Remove breadcrumb entirely. The secondary panel's "Back to Projects" + dropdown is sufficient.

```tsx
// Delete the Breadcrumb component entirely from the header
// Keep only: Project dropdown + Client name + Status badge
<header className="flex items-center justify-between px-4 py-3 border-b bg-background">
  <div className="flex items-center gap-3">
    {/* Project Selector Dropdown */}
    <ProjectSelector currentProjectId={project.id} />
    
    {/* Client & Status */}
    <span className="text-sm text-muted-foreground">{project.client_name}</span>
    <Badge variant={getStatusVariant(project.status)}>
      {project.status}
    </Badge>
  </div>
</header>
```

**After - Option B (Keep minimal breadcrumb):**
Keep "Projects" as a clickable link only, no project name.

```tsx
<header className="flex items-center gap-4 px-4 py-3 border-b bg-background">
  {/* Simple back link */}
  <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="gap-1 text-muted-foreground">
    <ChevronLeft className="h-4 w-4" />
    Projects
  </Button>
  
  <Separator orientation="vertical" className="h-6" />
  
  {/* Project Selector Dropdown */}
  <ProjectSelector currentProjectId={project.id} />
  
  {/* Client & Status */}
  <div className="flex items-center gap-2 ml-auto">
    <span className="text-sm text-muted-foreground">{project.client_name}</span>
    <Badge variant={getStatusVariant(project.status)}>
      {project.status}
    </Badge>
  </div>
</header>
```

**Recommendation:** Go with Option A. The secondary panel already has "← Back to Projects" - we don't need it twice.

---

## Issue 3: Sidebar Width Optimization

### Problem
With both sidebars expanded, content area is cramped on smaller screens (1366px laptops).

### Solution
Reduce sidebar widths slightly:
- App Sidebar: 240px → 200px (expanded), 48px (collapsed)
- Project Panel: ~200px → 180px (expanded), 48px (collapsed)

### Implementation

**File:** `src/components/AppSidebar.tsx`

Check if width is controlled via CSS variable or className. Look for:
```tsx
<Sidebar className="w-[240px]" ... />
// or
<Sidebar style={{ '--sidebar-width': '240px' }} ... />
```

**Update to:**
```tsx
<Sidebar className="w-[200px]" collapsible="icon" ... />
```

**File:** `src/components/ProjectSecondaryPanel.tsx` (or wherever secondary panel is defined)

```tsx
// Reduce expanded width
<aside className={cn(
  "border-r bg-muted/30 transition-all duration-200 flex flex-col",
  panelCollapsed ? "w-12" : "w-44"  // 48px collapsed, 176px expanded
)}>
```

---

## Issue 4: Visual Hierarchy Between Sidebars

### Problem
Both sidebars have similar visual weight. It's not immediately clear which is "global" vs "contextual".

### Solution
Differentiate them visually:
- App Sidebar: Slightly darker background, stronger border
- Project Panel: Lighter background (current muted/30 is good), softer appearance

### Implementation

**File:** `src/components/AppSidebar.tsx`

```tsx
<Sidebar 
  collapsible="icon" 
  className="border-r bg-sidebar"  // Uses sidebar background from theme
>
```

**File:** `src/components/ProjectSecondaryPanel.tsx`

```tsx
<aside className={cn(
  "border-r border-border/50 bg-muted/20 transition-all duration-200",  // Lighter, softer
  // ...
)}>
```

---

## Issue 5: Collapse Button Styling (Project Panel)

### Problem
The "< Collapse" button at bottom of project panel works but looks plain.

### Solution
Style it to match the app sidebar's collapse interaction pattern.

### Implementation

```tsx
// Current (plain):
<Button variant="ghost" size="sm">
  <ChevronLeft className="h-4 w-4 mr-2" />
  Collapse
</Button>

// Improved:
<div className="p-2 border-t border-border/50">
  <Button
    variant="ghost"
    size="sm"
    className={cn(
      "w-full justify-center text-muted-foreground hover:text-foreground",
      panelCollapsed && "px-0"
    )}
    onClick={() => setPanelCollapsed(!panelCollapsed)}
  >
    {panelCollapsed ? (
      <ChevronRight className="h-4 w-4" />
    ) : (
      <>
        <ChevronLeft className="h-4 w-4 mr-2" />
        <span className="text-xs">Collapse</span>
      </>
    )}
  </Button>
</div>
```

---

## Issue 6: Mobile Considerations

### Problem
Need to verify mobile behavior with dual sidebars.

### Requirements
1. On mobile, App Sidebar opens via hamburger (already working)
2. On mobile, Project Panel should NOT show as permanent sidebar
3. Project panel nav should be accessible via a sheet/drawer triggered from header

### Verification
Test at 375px width:
- [ ] Only content visible by default
- [ ] Hamburger opens App Sidebar as sheet
- [ ] Project context nav accessible (Building2 icon or similar trigger)
- [ ] No horizontal overflow

---

## Issue 7: Active State Consistency

### Problem
Ensure active states are visually consistent between:
- App Sidebar nav items
- Project Panel nav items

### Solution
Both should use the same active styling:
- Left border accent (orange/primary)
- Background highlight
- Font weight semibold

### Verification
Check both components use same pattern:
```tsx
className={cn(
  "cursor-pointer min-h-[44px]",
  active && "font-semibold bg-accent/50 border-l-2 border-primary"
)}
```

---

## Implementation Order

1. **App Sidebar Collapse** - Most impactful for UX
2. **Remove Redundant Breadcrumb** - Quick cleanup
3. **Width Optimization** - Helps content breathing room
4. **Visual Hierarchy** - Polish
5. **Project Panel Collapse Styling** - Polish
6. **Mobile Verification** - QA

---

## Testing Checklist

After all changes:

### Desktop (1920px)
- [ ] App sidebar collapses/expands smoothly
- [ ] Collapsed state shows only icons with tooltips
- [ ] Project panel collapses/expands
- [ ] Content area has adequate space with both expanded
- [ ] Content area maximizes when both collapsed

### Desktop (1366px - laptop)
- [ ] Both sidebars fit without content squeeze
- [ ] Consider defaulting one to collapsed

### Mobile (375px)
- [ ] No permanent sidebars visible
- [ ] Hamburger → App nav sheet
- [ ] Project nav accessible via trigger
- [ ] No horizontal scroll

### Visual
- [ ] Active states consistent
- [ ] Sidebar visual hierarchy clear
- [ ] Transitions smooth (200-300ms)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AppSidebar.tsx` | Add SidebarTrigger, SidebarRail, reduce width |
| `src/components/ProjectDetailView.tsx` | Remove/simplify breadcrumb header |
| `src/components/ProjectSecondaryPanel.tsx` | Reduce width, update bg, improve collapse button |
| `src/components/AppLayout.tsx` | Verify SidebarProvider props |

---

## Quick Wins (Do First)

1. Add `<SidebarRail />` to AppSidebar for collapse functionality
2. Delete the breadcrumb from project header
3. Reduce sidebar widths by 20-40px each

These three changes will immediately improve the experience.
