
# Add PTO Constants to MobileTimeTracker.tsx

## Overview
Add the PTO project detection constants and helper function to `MobileTimeTracker.tsx`, matching the pattern used in `WeekView.tsx`. This enables the "Today" view to properly identify PTO entries.

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Change Details

### Location
- **Insert after:** Line 37 (`import { ProjectCategory } from '@/types/project';`)
- **Insert before:** Line 40 (`interface Project {`)

### Code to Add
```typescript
// PTO/Overhead project numbers that don't have traditional start/end times
const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

const isPTOProject = (projectNumber: string): boolean => {
  return PTO_PROJECT_NUMBERS.includes(projectNumber);
};
```

### Result
Lines 37-46 will become:
```typescript
import { ProjectCategory } from '@/types/project';

// PTO/Overhead project numbers that don't have traditional start/end times
const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

const isPTOProject = (projectNumber: string): boolean => {
  return PTO_PROJECT_NUMBERS.includes(projectNumber);
};

interface Project {
  id: string;
```

## No Other Changes
This is a targeted addition only. No other code in the file will be modified.
