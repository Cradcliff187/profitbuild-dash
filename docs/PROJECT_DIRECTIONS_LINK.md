# Add Directions Link to Project Schedule Selector

## Overview

Add a clickable navigation pin icon next to project addresses in the Project Schedule Selector modal. Tapping the pin opens Google Maps directions to the job site. This is **100% free** - no API key required.

---

## File to Modify

`src/components/time-tracker/ProjectScheduleSelector.tsx`

---

## Changes Required

### 1. Update Import (Line ~3)

**BEFORE:**
```tsx
import { X, Calendar, ChevronRight } from 'lucide-react';
```

**AFTER:**
```tsx
import { X, Calendar, ChevronRight, Navigation } from 'lucide-react';
```

---

### 2. Update Address Display (Around Line 85-88)

**FIND THIS CODE:**
```tsx
{project.address && (
  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
    {project.address}
  </p>
)}
```

**REPLACE WITH:**
```tsx
{project.address && (
  <div className="flex items-center gap-1.5 mt-0.5">
    <p className="text-xs text-muted-foreground/70 truncate flex-1">
      {project.address}
    </p>
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(project.address)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex-shrink-0 p-2 -m-2 text-blue-500 hover:text-blue-700 active:scale-95 transition-all"
      aria-label="Get directions"
    >
      <Navigation className="w-4 h-4" />
    </a>
  </div>
)}
```

---

## Why This Works

| Concern | Solution |
|---------|----------|
| **Prevents row click** | `onClick={(e) => e.stopPropagation()}` stops the click from bubbling up to the parent button that selects the project |
| **Touch-friendly** | `p-2 -m-2` creates a 48px touch target while keeping the icon visually small (16px) |
| **Free service** | Google Maps URL API requires no API key for direction links |
| **Accessibility** | `aria-label` provides screen reader support |

---

## URL Format

```
https://www.google.com/maps/dir/?api=1&destination={encoded_address}
```

- `dir/` = Directions mode (shows route from user's current location)
- `api=1` = Use the latest Maps URL API
- `destination` = URL-encoded destination address

**Example:**
```
https://www.google.com/maps/dir/?api=1&destination=7675%20Wellness%20Way%20Suite%20301%20West%20Chester%2C%20OH%2045069
```

---

## Testing Checklist

- [ ] Navigation icon appears next to addresses
- [ ] Tapping icon opens Google Maps in new tab
- [ ] Tapping icon does NOT select the project (row click still works separately)
- [ ] Icon is easily tappable on mobile (48px touch target)
- [ ] Projects without addresses show no icon
- [ ] Tapping the rest of the row still selects the project normally
