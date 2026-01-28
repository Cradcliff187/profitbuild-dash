

# Fix: Scroll Reset Timing Issue

## Problem

The scroll-to-top effect runs **before** the preview content renders. The sequence is:
1. `setCurrentStep('preview')` triggers
2. `useEffect` fires immediately (same tick)
3. `scrollTop = 0` executes on OLD content
4. React then renders the NEW preview content (still at old scroll position)

## Solution

Add a small delay to ensure the new content has rendered before scrolling.

---

## Technical Change

### File: `src/components/contracts/ContractGenerationModal.tsx`

**Update the scroll useEffect (lines 220-225):**

```typescript
// Before (current code):
useEffect(() => {
  if (contentRef.current) {
    contentRef.current.scrollTop = 0;
  }
}, [currentStep]);

// After (with render delay):
useEffect(() => {
  // Use requestAnimationFrame to wait for the next paint cycle
  // This ensures the new step's content has rendered before scrolling
  requestAnimationFrame(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  });
}, [currentStep]);
```

---

## Why This Works

| Method | When it runs |
|--------|--------------|
| Direct `scrollTop = 0` | Immediately, before React re-renders |
| `requestAnimationFrame` | After browser has painted new content |

This ensures the preview content is actually in the DOM before we scroll.

---

## Alternative (if needed)

If the single `requestAnimationFrame` isn't enough, we could use `setTimeout(() => ..., 0)` or double `requestAnimationFrame`, but typically one is sufficient.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/contracts/ContractGenerationModal.tsx` | Wrap scroll in `requestAnimationFrame` |

---

This is a 3-line change that ensures the scroll reset happens after React has rendered the new step's content.

