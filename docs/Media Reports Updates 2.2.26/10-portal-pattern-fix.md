# 10 — Portal Pattern Fix

## Priority: Tenth (Small Reliability Improvement)
## Risk Level: Low — contained to gallery component
## Estimated Time: 15 minutes
## Depends On: Nothing (can run independently)

---

## Context

`ProjectMediaGallery.tsx` uses a DOM query to find a portal target for rendering external controls:

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

Find this code:
```typescript
const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

useEffect(() => {
  if (hideInternalTabs) {
    const target = document.getElementById('field-media-controls');
    setPortalTarget(target);
  }
}, [hideInternalTabs]);
```

Replace with:
```typescript
const portalTarget = controlsContainerRef?.current || null;
```

This eliminates:
- The `useState` for portalTarget
- The `useEffect` with DOM query
- The timing dependency on `#field-media-controls` existing

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
