

# Update TimeEntry Interface with Lunch Tracking Fields

## Overview
Add lunch tracking fields to the `TimeEntry` interface in `MobileTimeTracker.tsx` to properly support the lunch indicator logic that was recently implemented in the entry cards.

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Current State (Lines 66-78)
```typescript
interface TimeEntry {
  id: string;
  teamMember: TeamMember;
  project: Project;
  hours: number;
  receiptUrl?: string;
  attachment_url?: string;
  startTime: Date;
  endTime: Date;
  startTimeString?: string;
  endTimeString?: string;
  approval_status?: string;
}
```

## Change Details

### Replace Lines 66-78
**Updated:**
```typescript
interface TimeEntry {
  id: string;
  teamMember: TeamMember;
  project: Project;
  hours: number;
  receiptUrl?: string;
  attachment_url?: string;
  startTime: Date;
  endTime: Date;
  startTimeString?: string;
  endTimeString?: string;
  approval_status?: string;
  lunch_taken?: boolean;
  lunch_duration_minutes?: number | null;
  gross_hours?: number;
}
```

## New Fields Added
| Field | Type | Description |
|-------|------|-------------|
| `lunch_taken` | `boolean \| undefined` | Whether lunch was recorded for the entry |
| `lunch_duration_minutes` | `number \| null \| undefined` | Duration of lunch break in minutes |
| `gross_hours` | `number \| undefined` | Total shift hours before lunch deduction |

## Purpose
These fields will allow the entry card rendering logic to use the actual database values for lunch tracking instead of calculating/inferring from gross vs net hours, ensuring consistency with the `WeekView` component.

