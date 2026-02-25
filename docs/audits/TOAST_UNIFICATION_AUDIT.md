# Toast Unification — Full Audit Report

**Audit date:** 2025-02-09  
**Scope:** Post-migration verification of Radix → Sonner toast unification.

---

## 1. Verification of migration claims

| Claim | Status | Notes |
|-------|--------|------|
| Zero remaining `useToast` / `use-toast` / `@radix-ui/react-toast` / `next-themes` in `src/` | **PASS** | No matches in codebase |
| Zero remaining Radix-style `toast({` calls | **PASS** | No `toast(\s*\{` matches |
| TypeScript `tsc --noEmit` passes | **Not re-run** | Migration summary stated it passes |
| `npm run build` succeeds | **PASS** | Build completed in ~17s, exit 0 |
| Single Toaster in app | **PASS** | Only `<Toaster />` from `@/components/ui/sonner` in `App.tsx` |
| Radix toast packages removed from `package.json` | **PASS** | No `@radix-ui/react-toast` or `next-themes` in dependencies |
| Radix toast removed from `vite.config.ts` manualChunks | **PASS** | `manualChunks` does not reference `@radix-ui/react-toast` (and never did in current config) |

---

## 2. Sonner setup

- **`src/components/ui/sonner.tsx`**  
  Uses `theme="system"`, `richColors`, `closeButton`, `position="bottom-right"`, `duration={4000}`, and `toastOptions.classNames`. No `next-themes` import; Sonner’s `theme="system"` uses `prefers-color-scheme` internally, so behavior is consistent.

- **`src/App.tsx`**  
  Single `<Toaster />` from sonner; no Radix `<Toaster />`. Layout is correct.

---

## 3. Consumer usage

- **~97 files** import `toast` from `"sonner"` and use `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`, or neutral `toast(...)`.
- **`description`** is used widely (e.g. `toast.success("Title", { description: "..." })`). Sonner supports this; no issue.
- **`duration`** overrides (e.g. `duration: 2000`, `duration: Infinity`) are valid.
- **Action pattern** `action: { label: string, onClick: () => void }` is used correctly in:
  - `main.tsx` (PWA update / offline)
  - `useProjectData.tsx` (Retry)
  - `EstimateForm.tsx` (Retry)
  - `FieldPhotoCapture.tsx`, `BidPhotoCapture.tsx` (Open in New Tab)
  - `VoiceCaptionModal.tsx` (Retry / Try Again)

---

## 4. Issues and concerns

### 4.1 **CaptionPromptToast.tsx — non-standard action/cancel (medium concern)**

**File:** `src/components/CaptionPromptToast.tsx`

- **Current usage:**  
  - `action` is a **React node** (JSX with two `<Button>`s: Voice / Type).  
  - `cancel` is `{ label: <X className="h-3 w-3" />, onClick: () => {} }` (React node as `label`).

- **Sonner types:**  
  `action?: Action | React.ReactNode` and `cancel?: Action | React.ReactNode`, and `Action.label` is `React.ReactNode`, so this is **type-valid**.

- **Risk:**  
  Sonner’s default behavior for `action` is often a single button with `label` + `onClick`. When `action` is raw JSX (e.g. a div with two buttons), the library may:
  - Render it as custom content (and your buttons would work), or  
  - Not attach events/layout the same way as the standard action button.

- **Recommendation:**  
  Manually test the caption prompt flow (e.g. after media capture) and confirm:
  - The toast shows with two buttons (Voice / Type).
  - Clicking each button runs the right handler and dismisses the toast.
  - The close (X) control works.  
  If anything is broken, refactor to Sonner’s standard `action: { label, onClick }` (e.g. one primary action in the toast, or use `toast.custom()` for full custom content).

---

### 4.2 **main.tsx — `toast()` (neutral) and `dismissible`**

- **Usage:**  
  `toast('Update Available', { description, action: { label: 'Reload Now', onClick: ... }, duration: Infinity, dismissible: true })` and `toast('App Ready', { description, duration: 3000 })`.

- **Sonner API:**  
  `dismissible` and `duration: Infinity` are supported. Global `closeButton: true` in your wrapper already gives a close button.

- **Recommendation:**  
  No change required. Optionally smoke-test PWA update and offline-ready flows to confirm the persistent “Update Available” toast appears and can be dismissed or used to reload.

---

### 4.3 **conflictResolution.ts — commented-out toast**

- **File:** `src/utils/conflictResolution.ts`  
- **Content:** Comment only: `// toast.warning('Your offline changes were overwritten by server updates');`  
- **Impact:** None. If you enable it later, use `toast` from `"sonner"` and `toast.warning(...)`.

---

### 4.4 **Theme: `theme="system"` without next-themes**

- **Current:** Sonner is configured with `theme="system"` and `next-themes` was removed.
- **Behavior:** Sonner resolves `"system"` itself (e.g. via `prefers-color-scheme`). There are no remaining `ThemeProvider` or `useTheme` usages from `next-themes` in `src/`.
- **Risk:** If the app had relied on next-themes for a *stored* theme (e.g. user choice overridden by system), that override is no longer there. Sonner will still follow system light/dark; the rest of the app’s theme may need to be driven by another mechanism if you add a theme switcher later.
- **Recommendation:** For the current migration, no change. When adding a theme switcher, wire it to your own theme context or CSS/class and keep Sonner’s `theme="system"` or align it with that context if needed.

---

## 5. Summary

| Area | Status | Action |
|------|--------|--------|
| Radix/next-themes removal | Clean | None |
| Single Sonner Toaster | Correct | None |
| Standard toast calls (success/error/warning/info + description/duration/action) | Correct | None |
| **CaptionPromptToast** (JSX action + cancel with React node label) | Type-valid; runtime unclear | **Manually test** caption prompt; refactor to standard action or `toast.custom()` if needed |
| main.tsx PWA toasts | API-valid | Optional smoke-test |
| theme="system" without next-themes | OK for Sonner | Revisit only if you add app-wide theme switching |

**Conclusion:** The migration is consistent and the build is clean. The only notable risk is **CaptionPromptToast.tsx** using custom JSX for `action` and a React node for `cancel.label`; behavior should be confirmed in the app and adjusted if the toast or buttons don’t behave as expected.
