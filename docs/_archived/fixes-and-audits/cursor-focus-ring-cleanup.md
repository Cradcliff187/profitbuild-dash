# Cursor Agent: Focus Ring Cleanup - Dropdown & Input Components

## Overview

**Problem:** Orange focus rings on dropdowns, comboboxes, and search inputs look unfinished and unprofessional. The rings get clipped by parent containers (especially Popovers), creating a partially visible border that degrades the UI quality.

**Solution:** Replace thick `ring-2` focus styles with subtle, contained focus indicators using bottom borders or inset shadows that don't clip.

**Scope:** All shadcn/ui base components and any custom components using focus ring patterns.

---

## Phase 1: Update Base UI Components

### Task 1.1: Update `src/components/ui/command.tsx`

**Find the `CommandInput` component's wrapper div and update the focus styles.**

**Current code (find this pattern):**
```tsx
<div className="flex items-center border-b border-border px-3 focus-within:border-2 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/20 focus-within:ring-offset-0 rounded-t-md transition-colors" cmdk-input-wrapper="">
```

**Replace with:**
```tsx
<div className="flex items-center border-b border-border px-3 focus-within:border-b-2 focus-within:border-foreground/40 transition-colors" cmdk-input-wrapper="">
```

**Key changes:**
- Remove `focus-within:ring-2`, `focus-within:ring-foreground/20`, `focus-within:ring-offset-0`
- Remove `focus-within:border-2` (was applying to all sides)
- Remove `rounded-t-md` (not needed without full border)
- Change to `focus-within:border-b-2` (bottom border only)
- Increase opacity to `focus-within:border-foreground/40` for visibility

---

### Task 1.2: Update `src/components/ui/select.tsx`

**Find the `SelectTrigger` component and update focus styles.**

**Current code (find this pattern):**
```tsx
className={cn(
  "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  className,
)}
```

**Replace with:**
```tsx
className={cn(
  "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 focus:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  className,
)}
```

**Key changes:**
- Remove `focus:ring-2 focus:ring-ring focus:ring-offset-2`
- Add `focus:border-foreground/40` for subtle border darkening
- Add `focus:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]` for contained inset glow

---

### Task 1.3: Update `src/components/ui/input.tsx`

**Find the Input component and update focus styles.**

**Current code (find this pattern):**
```tsx
className={cn(
  "flex h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-2 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 lg:px-3 lg:py-1.5",
  className,
)}
```

**Replace with:**
```tsx
className={cn(
  "flex h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)] disabled:cursor-not-allowed disabled:opacity-50 lg:px-3 lg:py-1.5",
  className,
)}
```

**Key changes:**
- Remove `focus-visible:border-2` (keeps border at 1px, just changes color)
- Remove `focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0`
- Add `focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]` for contained glow

---

### Task 1.4: Update `src/components/ui/native-select.tsx`

**Find the NativeSelect component and update focus styles.**

**Current code (find this pattern):**
```tsx
className={cn(
  "h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs",
  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "[&>option]:bg-background [&>option]:text-foreground",
  className
)}
```

**Replace with:**
```tsx
className={cn(
  "h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs",
  "focus:outline-none focus:border-foreground/40 focus:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "[&>option]:bg-background [&>option]:text-foreground",
  className
)}
```

---

### Task 1.5: Update `src/components/ui/textarea.tsx` (if exists)

**Search for textarea component and apply same pattern.**

**Replace any instances of:**
```tsx
focus:ring-2 focus:ring-ring focus:ring-offset-2
// or
focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0
```

**With:**
```tsx
focus:border-foreground/40 focus:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]
// or
focus-visible:border-foreground/40 focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]
```

---

### Task 1.6: Update `src/components/ui/slider.tsx`

**Find the Slider Thumb and update focus styles.**

**Current code (find this pattern):**
```tsx
<SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
```

**Replace with:**
```tsx
<SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:border-foreground/60 focus-visible:shadow-[0_0_0_2px_hsl(var(--foreground)/0.15)] disabled:pointer-events-none disabled:opacity-50" />
```

---

## Phase 2: Search for Additional Ring Usage

### Task 2.1: Global Search and Review

**Run this search across the entire `src/` directory:**

```
Search pattern: focus:ring-2|focus-visible:ring-2|focus-within:ring-2
```

**For each result found:**
1. Determine if it's inside a container that could clip (Popover, Dialog, Sheet, etc.)
2. If yes, apply the same pattern replacement
3. If it's a standalone button or element with no clipping risk, you may leave it OR update for consistency

---

### Task 2.2: Check Component-Specific Files

**Search these files for any remaining ring patterns:**

- `src/components/ui/popover.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/combobox.tsx` (if exists)
- `src/components/ui/autocomplete.tsx` (if exists)

---

## Phase 3: Update Global CSS (Optional Refinement)

### Task 3.1: Review `src/index.css`

**Find the global focus-visible rules:**

```css
/* Enhanced focus indicators for accessibility */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Consider updating to:**

```css
/* Enhanced focus indicators for accessibility */
*:focus-visible {
  outline: none;
}

/* Explicit focus for interactive elements */
button:focus-visible,
a:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 4px;
}

/* Input elements use shadow-based focus (handled in component classes) */
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: none;
}
```

**Rationale:** This prevents the global outline from conflicting with component-level focus styles.

---

## Phase 4: Verify Filter Components

### Task 4.1: Check Filter Search Inputs

**These files have search inputs inside Popovers that may have custom focus styles:**

- `src/components/ProjectFilters.tsx`
- `src/components/QuoteFilters.tsx`
- `src/components/EstimateSearchFilters.tsx`
- `src/components/ReceiptSearchFilters.tsx`
- `src/components/FieldProjectSelector.tsx`

**Look for any inline `focus-within:` or `focus:ring` classes on wrapper divs around inputs.**

**Example in `FieldProjectSelector.tsx`:**
```tsx
<div className="flex items-center border-b border-border px-3 pb-2 pt-2 focus-within:border-2 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/20 focus-within:ring-offset-0 transition-colors">
```

**Replace with:**
```tsx
<div className="flex items-center border-b border-border px-3 pb-2 pt-2 focus-within:border-b-2 focus-within:border-foreground/40 transition-colors">
```

---

## Testing Checklist

After completing all changes, verify these scenarios:

### Visual Testing
- [ ] Projects page → Client dropdown filter (shown in screenshot)
- [ ] Projects page → Status dropdown filter
- [ ] Projects page → Job Types dropdown filter
- [ ] Any search input inside a Popover
- [ ] Select triggers throughout the app
- [ ] Standard text inputs
- [ ] Time tracking modal dropdowns

### Keyboard Navigation Testing
- [ ] Tab through form fields - focus should be clearly visible
- [ ] Focus indicator should not be clipped by any container
- [ ] Focus indicator should not cause layout shift

### Dark Mode Testing (if applicable)
- [ ] Focus indicators visible in dark mode
- [ ] Sufficient contrast in both themes

---

## Summary of Pattern Replacements

| Old Pattern | New Pattern |
|-------------|-------------|
| `focus:ring-2 focus:ring-ring focus:ring-offset-2` | `focus:border-foreground/40 focus:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]` |
| `focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0` | `focus-visible:border-foreground/40 focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]` |
| `focus-within:ring-2 focus-within:ring-foreground/20` | `focus-within:border-b-2 focus-within:border-foreground/40` |
| `focus-visible:border-2` | (remove - keep border at 1px) |

---

## Git Commit Message

```
fix(ui): replace clipped focus rings with contained focus indicators

- Update CommandInput to use bottom border focus instead of ring
- Update SelectTrigger, Input, NativeSelect with inset shadow focus
- Remove ring-offset patterns that cause visual clipping in Popovers
- Maintain accessibility with clear, contained focus indicators

Fixes: Orange focus borders partially visible/clipped in dropdowns
```
