# Status Badge Styling Guide

## Overview

This guide explains the standardized status badge system implemented across the application. All status badges now use a centralized color system and reusable components for consistency.

## Core Files

- **`src/lib/statusColors.ts`** - Single source of truth for all status badge colors
- **`src/components/ui/status-badge.tsx`** - Reusable StatusBadge components

## Usage

Always use StatusBadge components instead of inline Badge styling with conditional classes.

### Available Components

- `ProjectStatusBadge` - For project statuses (estimating, approved, in_progress, complete, on_hold, cancelled)
- `EstimateStatusBadge` - For estimate statuses (draft, sent, approved, rejected, expired)
- `ExpenseStatusBadge` - For expense statuses (pending, approved, rejected)
- `ChangeOrderStatusBadge` - For change order statuses (draft, pending, approved, rejected)
- `QuoteStatusBadge` - For quote statuses (pending, accepted, rejected, expired)

## Examples

### Basic Usage

```tsx
import { ProjectStatusBadge } from "@/components/ui/status-badge";

// Simple usage
<ProjectStatusBadge status={project.status} />

// With size variant
<ProjectStatusBadge status={project.status} size="sm" />

// With custom label
<ProjectStatusBadge status="in_progress" label="Active" />

// With additional className
<ProjectStatusBadge 
  status={project.status} 
  size="xs" 
  className="flex-shrink-0"
/>
```

### All Status Types

```tsx
import { 
  ProjectStatusBadge, 
  EstimateStatusBadge,
  ExpenseStatusBadge,
  ChangeOrderStatusBadge,
  QuoteStatusBadge
} from "@/components/ui/status-badge";

// Project status
<ProjectStatusBadge status="in_progress" />

// Estimate status
<EstimateStatusBadge status="sent" />

// Expense status
<ExpenseStatusBadge status="pending" />

// Change order status
<ChangeOrderStatusBadge status="approved" />

// Quote status
<QuoteStatusBadge status="accepted" />
```

## Color Standards

All status colors are defined in `statusColors.ts` with dark mode support built-in.

### Project Statuses

| Status | Color | Rationale |
|--------|-------|-----------|
| **estimating** | Amber | Work in progress, needs attention |
| **approved** | Green (#22c55e) | Contract signed, ready to start |
| **in_progress** | Blue | Active work happening |
| **complete** | Emerald (#10b981) | Finished, distinct from approved |
| **on_hold** | Yellow | Warning state, paused |
| **cancelled** | Red | Negative, stopped |

### Key Distinctions

#### Approved vs Complete

This is an intentional and important distinction:

- **Approved** (Green #22c55e) - Contract has been signed and project is ready to begin work
- **Complete** (Emerald #10b981) - Work has been finished and project is delivered

The colors are deliberately different to provide clear visual distinction between "ready to start" and "actually finished."

#### Estimating Color Change

- **Old:** Gray (implied inactive/disabled)
- **New:** Amber (implies work in progress, needs attention)

Better conveys the active nature of the estimating phase.

## Size Variants

Three size variants are available:

| Size | Height | Use Case |
|------|--------|----------|
| **xs** | h-4 (16px) | Compact contexts, mobile cards, tight layouts |
| **sm** | h-5 (20px) | Standard size, most common usage |
| **default** | - | Larger contexts, emphasis needed |

```tsx
<ProjectStatusBadge status="approved" size="xs" />      // 16px
<ProjectStatusBadge status="approved" size="sm" />      // 20px (default)
<ProjectStatusBadge status="approved" size="default" /> // Larger
```

## Runtime Validation

In development mode, the system will log console warnings if an unknown status is encountered:

```
Unknown project status: "invalid_status". Using default color.
```

This helps catch typos and invalid status values during development.

## Dark Mode Support

All status colors automatically adapt to dark mode with appropriate contrast ratios.

## Migration Guide

### Before (Old Pattern)

```tsx
<Badge
  variant="outline"
  className={cn(
    "text-xs capitalize px-2 py-0.5",
    status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
    status === 'estimating' && 'border-gray-200 text-gray-700 bg-gray-50',
  )}
>
  {status.replace(/_/g, ' ')}
</Badge>
```

### After (New Pattern)

```tsx
<ProjectStatusBadge status={status} size="sm" />
```

## Type Safety

All status types are strongly typed with TypeScript discriminated unions.

## Best Practices

1. ✅ **DO** use the convenience components (`ProjectStatusBadge`, etc.)
2. ✅ **DO** specify size based on context (`xs` for cards, `sm` for standard)
3. ✅ **DO** rely on the centralized color system
4. ❌ **DON'T** create inline Badge components with conditional color classes
5. ❌ **DON'T** hardcode status colors anywhere in the application
6. ❌ **DON'T** create custom `getStatusColor` functions - use the centralized ones

## Support

For questions or issues with the status badge system, refer to:
- Source code: `src/lib/statusColors.ts` and `src/components/ui/status-badge.tsx`
- This guide: `src/lib/README.md`
