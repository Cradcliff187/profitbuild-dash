
# Add CheckSquare Icon Import to MobileTimeTracker.tsx

## Overview
Add the `CheckSquare` icon to the lucide-react import in `MobileTimeTracker.tsx`. This icon is needed for the lunch indicator in the "Today" view cards.

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Current State (Line 2)
```typescript
import { Clock, MapPin, User, Play, Square, Edit2, Calendar, Loader2, AlertCircle, Camera, Check, AlertTriangle, BarChart3, Coffee } from 'lucide-react';
```

**Note:** `Square` is already imported (used elsewhere in the component).

## Change Details

### Update Line 2
**After:**
```typescript
import { Clock, MapPin, User, Play, Square, Edit2, Calendar, Loader2, AlertCircle, Camera, Check, AlertTriangle, BarChart3, Coffee, CheckSquare } from 'lucide-react';
```

## Icon Usage
- **CheckSquare** (green): Indicates lunch was recorded
- **Square** (amber): Indicates no lunch recorded for shifts >6 hours

## No Other Changes
This is a targeted import update only. No other code in the file will be modified.
