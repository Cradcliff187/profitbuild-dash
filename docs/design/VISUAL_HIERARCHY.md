# Visual Hierarchy Implementation

## Overview
Add visual depth and hierarchy to the application through strategic use of background colors and shadows. This creates clear distinction between navigation layers and content.

**IMPORTANT:** Do NOT modify any Time Tracker components or pages. They are excluded from this update.

---

## Design System

```
Layer 0 (deepest):   App Sidebar      → Dark branded background
Layer 1 (middle):    Project Panel    → Light muted background
Layer 2 (surface):   Content Area     → Subtle off-white
Layer 3 (elevated):  Cards            → Pure white with shadow
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Dark theme styling |
| `src/components/ProjectDetailView.tsx` | Project panel + content area styling |
| `src/components/AppLayout.tsx` | Content area background |
| `src/index.css` or theme | Add sidebar dark theme variables (if needed) |

## Files to NOT Modify

| File | Reason |
|------|--------|
| `src/components/time-tracker/*` | Excluded - do not touch |
| `src/pages/TimeTracker.tsx` | Excluded - do not touch |
| `src/pages/TimeEntries.tsx` | Excluded - keep current styling |
| `src/components/MobileTimeTracker.tsx` | Excluded - do not touch |
| Any file with "time" in the path | Excluded unless explicitly layout-related |

---

## Implementation Details

### 1. AppSidebar - Dark Theme

**File:** `src/components/AppSidebar.tsx`

Update the Sidebar component wrapper:

```tsx
<Sidebar 
  collapsible="icon" 
  className="border-r border-slate-700 bg-slate-900"
>
```

Update SidebarHeader:

```tsx
<SidebarHeader className="border-b border-slate-700 px-3 py-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <img
        src="https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Large%20Icon%20Only.png"
        alt="RCG"
        className="h-7 w-7 shrink-0"
      />
      {!collapsed && (
        <span className="font-bold text-base text-white">RCG Work</span>
      )}
    </div>
    {!collapsed && (
      <SidebarTrigger className="h-7 w-7 text-slate-400 hover:text-white" />
    )}
  </div>
</SidebarHeader>
```

Update SidebarGroupLabel for dark theme:

```tsx
<SidebarGroupLabel className="text-xs uppercase text-slate-400 mb-1">
  {collapsed ? group.abbrev : group.label}
</SidebarGroupLabel>
```

Update SidebarMenuButton styling:

```tsx
<SidebarMenuButton
  onClick={() => handleNavigation(item.url)}
  isActive={active}
  tooltip={collapsed ? item.title : undefined}
  className={cn(
    "cursor-pointer min-h-[44px] py-2.5 text-slate-300 hover:text-white hover:bg-slate-800",
    active && "font-semibold bg-slate-800 text-white border-l-2 border-orange-500"
  )}
>
  <Icon className="h-5 w-5 shrink-0" />
  {!collapsed && <span className="text-sm">{item.title}</span>}
</SidebarMenuButton>
```

Update SidebarContent:

```tsx
<SidebarContent className="px-2 py-2 bg-slate-900">
```

Update SidebarSeparator:

```tsx
<SidebarSeparator className="my-2 bg-slate-700" />
```

Update SidebarFooter:

```tsx
<SidebarFooter className="border-t border-slate-700 bg-slate-900">
  {/* KPI Guide link */}
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => handleNavigation("/kpi-guide")}
        isActive={isActive("/kpi-guide")}
        tooltip={collapsed ? "KPI Guide" : undefined}
        className={cn(
          "cursor-pointer min-h-[40px] py-2 text-slate-300 hover:text-white hover:bg-slate-800",
          isActive("/kpi-guide") && "font-semibold bg-slate-800 text-white border-l-2 border-orange-500"
        )}
      >
        <BookOpen className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-sm">KPI Guide</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>

  <SidebarSeparator className="bg-slate-700" />

  {/* User Profile */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton
        size="lg"
        className="w-full justify-start gap-3 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-slate-700 text-white text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            <span className="text-sm font-medium truncate w-full text-white">
              {user?.email?.split("@")[0] || "User"}
            </span>
            <span className="text-xs text-slate-400 truncate w-full">
              {user?.email}
            </span>
          </div>
        )}
        {!collapsed && <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />}
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    {/* DropdownMenuContent stays default theme - it's a popover */}
  </DropdownMenu>
</SidebarFooter>
```

---

### 2. Project Secondary Panel - Light Muted

**File:** `src/components/ProjectDetailView.tsx` (or wherever the project panel is defined)

Find the project panel/aside element and update:

```tsx
<aside
  className={cn(
    "border-r border-border/60 bg-slate-50 transition-all duration-200 flex flex-col",
    panelCollapsed ? "w-12" : "w-48"
  )}
>
```

Update the "Back to Projects" button area:

```tsx
<div className="p-3 border-b border-border/60 bg-slate-50">
  <Button
    variant="ghost"
    size="sm"
    className="w-full justify-start gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    onClick={() => navigate("/projects")}
  >
    <ArrowLeft className="h-4 w-4" />
    {!panelCollapsed && "Back to Projects"}
  </Button>
</div>
```

Update section headers in project panel:

```tsx
<h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
  {group.label}
</h3>
```

Update nav buttons in project panel:

```tsx
<Button
  key={item.title}
  variant="ghost"
  size="sm"
  className={cn(
    "w-full justify-start gap-3 min-h-[44px] text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    active && "bg-white font-semibold text-slate-900 border-l-2 border-orange-500 shadow-sm",
    panelCollapsed && "justify-center px-2"
  )}
  onClick={() => handleNavigation(item.url)}
  title={panelCollapsed ? item.title : undefined}
>
  <Icon className="h-4 w-4 shrink-0" />
  {!panelCollapsed && <span>{item.title}</span>}
</Button>
```

Update collapse button:

```tsx
<div className="p-2 border-t border-border/60">
  <Button
    variant="ghost"
    size="sm"
    className={cn(
      "w-full justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100",
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

### 3. Content Area Background

**File:** `src/components/AppLayout.tsx`

Update the main content wrapper:

```tsx
<SidebarInset className="flex flex-col flex-1 bg-slate-50/50">
  {/* Mobile header */}
  {isMobile && (
    <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
      <SidebarTrigger />
      <span className="font-semibold">RCG Work</span>
    </header>
  )}
  
  {/* Main content area */}
  <main className="flex-1 overflow-auto">
    <Outlet />
  </main>
</SidebarInset>
```

---

### 4. Card Elevation (Optional Enhancement)

For any page that uses cards in the content area, ensure cards have subtle shadows.

**Pattern to apply where cards exist (NOT in time tracker):**

```tsx
<Card className="shadow-sm hover:shadow-md transition-shadow">
  {/* card content */}
</Card>
```

Or update default Card styling globally in `src/components/ui/card.tsx`:

```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",  // Added shadow-sm
      className
    )}
    {...props}
  />
))
```

---

## Color Reference

| Element | Background | Text | Border |
|---------|------------|------|--------|
| App Sidebar | `bg-slate-900` | `text-slate-300` / `text-white` (active) | `border-slate-700` |
| App Sidebar Active | `bg-slate-800` | `text-white` | `border-l-2 border-orange-500` |
| Project Panel | `bg-slate-50` | `text-slate-600` | `border-border/60` |
| Project Panel Active | `bg-white shadow-sm` | `text-slate-900` | `border-l-2 border-orange-500` |
| Content Area | `bg-slate-50/50` | default | default |
| Cards | `bg-white` | default | `shadow-sm` |

---

## Visual Result

```
┌──────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓ │ ░░░░░░░░░░░░░░ │                                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓ │ ░░░░░░░░░░░░░░ │   ┌─────────────────────────┐   │
│ ▓ RCG Work ▓ │ ░ Back to     ░ │   │                         │   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓ │ ░ Projects    ░ │   │   Card (white+shadow)   │   │
│ ▓ Dashboard▓ │ ░░░░░░░░░░░░░░ │   │                         │   │
│ ▓ Projects ▓ │ ░ Overview ██ ░ │   └─────────────────────────┘   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓ │ ░ Schedule    ░ │                                 │
│              │ ░ Estimates   ░ │   Content Area (slate-50/50)    │
│  Dark Slate  │ ░░░░░░░░░░░░░░ │                                 │
│    #0f172a   │   Light Gray    │                                 │
│              │    #f8fafc      │                                 │
└──────────────┴────────────────┴─────────────────────────────────┘
```

---

## Verification Checklist

- [ ] App Sidebar has dark slate background
- [ ] App Sidebar text is light (slate-300/white)
- [ ] App Sidebar active item has orange left border
- [ ] App Sidebar hover states work (bg-slate-800)
- [ ] Project Panel has light gray background (slate-50)
- [ ] Project Panel active item has white background + shadow
- [ ] Content area has subtle off-white tint
- [ ] Cards have subtle shadow
- [ ] All text remains readable (contrast check)
- [ ] Orange brand color pops on dark sidebar
- [ ] Mobile sidebar sheet also has dark theme

## Explicitly NOT Changed

- [ ] Time Tracker page - no changes
- [ ] Time Entries page - no changes  
- [ ] MobileTimeTracker component - no changes
- [ ] Any component in `/time-tracker/` folder - no changes
- [ ] Clock in/out UI - no changes

---

## Testing

1. Navigate through all main sections - verify dark sidebar
2. Open a project - verify light project panel
3. Check contrast accessibility (use browser dev tools)
4. Test collapsed states - both sidebars
5. Test mobile view - sidebar sheet should be dark
6. **Verify Time Tracker pages are unchanged**
