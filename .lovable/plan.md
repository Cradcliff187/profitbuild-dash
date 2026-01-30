

# Update Lucide-React Import in WeekView.tsx

## Overview
Add `CheckSquare` and `Square` icons to the existing lucide-react import statement for future use in the time tracker component.

## File to Modify

**File:** `src/components/time-tracker/WeekView.tsx`

## Change Details

**Location:** Line 3

**Current Code:**
```typescript
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
```

**Updated Code:**
```typescript
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckSquare, Square } from 'lucide-react';
```

## Purpose
These icons will be used for:
- `CheckSquare` - Indicating completed/checked items (lunch taken, etc.)
- `Square` - Indicating unchecked/incomplete items

## Note: Existing Build Errors
There are multiple unrelated build errors in the codebase regarding:
1. `adjusted_est_margin` missing from several type interfaces
2. `project_id_param` → `p_project_id` parameter name change in RPC calls
3. `ref` prop issue in status-badge component
4. `const` assertion error in EstimatesCardView

These are separate issues that need to be addressed independently.

