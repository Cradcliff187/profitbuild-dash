

# Make Mobile Sidebar Logo Larger

## Change

In `src/components/AppSidebar.tsx`, only one line changes -- the mobile horizontal logo sizing (around line 213):

**Current:**
```
className="w-auto max-h-[44px] max-w-[85%] object-contain drop-shadow-md"
```

**New:**
```
className="w-auto max-h-[72px] max-w-[90%] object-contain drop-shadow-md"
```

No other logos or views are touched.

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Increase mobile logo from max-h-44px to max-h-72px |

