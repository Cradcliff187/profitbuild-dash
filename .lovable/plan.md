
# Fix: Scroll to Top When Moving to Preview Step

## Problem
When clicking "Continue to Preview", the modal content stays at its current scroll position instead of scrolling to the top, making the preview appear in the middle of the page.

## Solution
Add a scroll-to-top action when transitioning to the preview step.

---

## Technical Change

### File: `src/components/contracts/ContractGenerationModal.tsx`

**Add a ref to the DialogContent and scroll to top on step change:**

1. **Add useRef import** (line 1):
```typescript
import { useState, useEffect, useRef } from 'react';
```

2. **Create ref for scroll container** (around line 141, with other state):
```typescript
const contentRef = useRef<HTMLDivElement>(null);
```

3. **Add useEffect to scroll on step change** (after line 217):
```typescript
useEffect(() => {
  if (contentRef.current) {
    contentRef.current.scrollTop = 0;
  }
}, [currentStep]);
```

4. **Attach ref to DialogContent** (line 370):
```typescript
<DialogContent ref={contentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

---

## Result

| Before | After |
|--------|-------|
| Preview shows mid-scroll | Preview shows from the top |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/contracts/ContractGenerationModal.tsx` | Add ref + scroll reset on step change |

---

This is a ~5 line change that ensures the modal scrolls to top whenever the user moves between steps.
