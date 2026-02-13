

# Fix: Larger Logo Without Expanding Header

## Problem
Increasing the logo's `max-h` also grows the header container, pushing the navigation list down.

## Solution
Constrain the mobile header area to a fixed height and let the larger logo fit within it using `overflow-hidden`. This way the logo renders bigger visually but the header stays the same size.

In `src/components/AppSidebar.tsx`, change the mobile logo container (around line 277):

**Current:**
```
<div className="flex items-center justify-center flex-1 min-w-0 py-1">
  <img ... className="w-auto max-h-[72px] max-w-[90%] object-contain drop-shadow-md" />
</div>
```

**New:**
```
<div className="flex items-center justify-center flex-1 min-w-0 h-10 overflow-hidden">
  <img ... className="w-auto max-h-[72px] max-w-[90%] object-contain drop-shadow-md" />
</div>
```

This fixes the header height at `h-10` (40px) so the divider stays in place, while the logo scales up to fill that space. If the logo still looks too small or too big at `h-10`, we can adjust to `h-12` (48px) or another value.

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Add fixed height + overflow-hidden to mobile logo container |

