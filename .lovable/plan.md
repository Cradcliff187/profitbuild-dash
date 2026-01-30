

# Add PTO Project Constants to WeekView.tsx

## Overview
Add a constant array and helper function to identify PTO/Overhead projects that don't have traditional start/end times.

## File to Modify

**File:** `src/components/time-tracker/WeekView.tsx`

## Change Details

**Location:** After line 10 (after imports, before the `formatTime` function)

**Code to Add:**
```typescript
// PTO/Overhead project numbers that don't have traditional start/end times
const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

const isPTOProject = (projectNumber: string): boolean => {
  return PTO_PROJECT_NUMBERS.includes(projectNumber);
};
```

## Current File Structure (lines 1-12)
```typescript
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ← INSERT NEW CODE HERE

const formatTime = (dateString: string | null | undefined): string | null => {
  // ...existing code
```

## After Change (lines 1-18)
```typescript
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// PTO/Overhead project numbers that don't have traditional start/end times
const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

const isPTOProject = (projectNumber: string): boolean => {
  return PTO_PROJECT_NUMBERS.includes(projectNumber);
};

const formatTime = (dateString: string | null | undefined): string | null => {
  // ...existing code
```

## Purpose
This constant and helper function will be used later to:
- Skip displaying start/end times for PTO entries
- Handle PTO entries differently in time calculations
- Identify when an entry is for sick leave, vacation, or holiday

---

## Note: Existing Build Errors

There are separate build errors related to `adjusted_est_margin` not existing on multiple types. These are unrelated to this change and would need to be addressed separately by adding `adjusted_est_margin` to the `Project` interface in `src/types/project.ts` (similar to how we added `actual_margin` earlier).

