# 10 — Portal Pattern Fix

## Priority: Tenth (Small Reliability Improvement)
## Risk Level: Low — contained to gallery component
## Estimated Time: 15 minutes
## Depends On: Nothing (can run independently)

---

## Context

`ProjectMediaGallery.tsx` uses a DOM query to find a portal target for rendering external controls.

**Note:** If you already ran the HOTFIX for the hooks order violation, this code was moved from after the early returns to the top of the component. Either way, you need to find and replace this pattern:

```typescript
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

useEffect(() => {
  if (hideInternalTabs) {
    const target = document.getElementById('field-media-controls');
    setPortalTarget(target);
  }
}, [hideInternalTabs]);
```

If `#field-media-controls` doesn't exist in the DOM at render time (due to render ordering, conditional layouts, or future refactors), the controls silently disappear. There's no error, no fallback — they just don't render.

## Fix

Replace the DOM query with a callback ref pattern. The parent component (`FieldMedia.tsx`) passes a ref to the gallery, and the gallery renders controls into it.

### File 1: `src/pages/FieldMedia.tsx`

**Add a ref for the controls container:**

```typescript
import { useRef } from 'react';

export default function FieldMedia() {
  const controlsRef = useRef<HTMLDivElement>(null);
  // ... existing code ...

  return (
    <div>
      {/* Controls container — ref passed to gallery */}
      <div ref={controlsRef} id="field-media-controls" />

      {/* Gallery */}
      <ProjectMediaGallery
        // ... existing props ...
        controlsContainerRef={controlsRef}
      />
    </div>
  );
}
```

### File 2: `src/components/ProjectMediaGallery.tsx`

**Add the ref prop to the component interface:**

```typescript
interface ProjectMediaGalleryProps {
  // ... existing props ...
  /** Ref to external container where filter/sort controls should be rendered */
  controlsContainerRef?: React.RefObject<HTMLDivElement>;
}
```

**Replace the DOM query with the ref:**

Find this code (after the hotfix, it should be at the TOP of the component with other hooks; before the hotfix, it was after the early returns — either way, find and remove it):

```typescript
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

useEffect(() => {
  if (hideInternalTabs) {
    const target = document.getElementById('field-media-controls');
    setPortalTarget(target);
  }
}, [hideInternalTabs]);
```

Replace with this single line (place it near where the `createPortal` call is, or just before the JSX return):
```typescript
const portalTarget = controlsContainerRef?.current || null;
```

This eliminates:
- The `useState` for portalTarget (removes 1 hook)
- The `useEffect` with DOM query (removes 1 hook)
- The timing dependency on `#field-media-controls` existing

**Note:** This is not just a style preference — the ref-based approach is more robust because it doesn't depend on DOM element IDs or render timing.

The `createPortal` call that uses `portalTarget` remains unchanged — it already handles `null` gracefully (renders nothing).

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Navigate to project → Field Media
- [ ] Filter/sort controls appear above the gallery (same position as before)
- [ ] Changing filter (Photos / Videos / All) works
- [ ] Changing sort order works
- [ ] Controls persist across gallery re-renders
- [ ] Navigate away and back — controls still render correctly

## What NOT to Change

- The actual portal rendering (`createPortal` call) — unchanged
- The controls UI itself — unchanged
- Other gallery pages that might use `ProjectMediaGallery` without the controls portal (they pass no ref, portalTarget stays null, controls render inline — same as current behavior)
