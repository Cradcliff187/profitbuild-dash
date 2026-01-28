
# Plan: Add Print to PDF Option for Contracts

## Overview
Add a "Print / Save as PDF" button across all contract display locations. This uses the browser's native print functionality with Google Docs Viewer, allowing users to select "Save as PDF" as the destination.

## Locations Requiring Print Button

| Location | File | Current Buttons |
|----------|------|-----------------|
| Quote View Page | `QuoteViewRoute.tsx` | DOCX, PDF download buttons |
| Quote Form (view mode) | `QuoteForm.tsx` | Preview (Eye), Download buttons |
| Contracts List View | `ContractsListView.tsx` | Download DOCX, PDF, Open buttons |
| Office Preview Modal | `OfficeDocumentPreviewModal.tsx` | Download, Open in New Tab |
| Contract Generation Success | `ContractGenerationSuccess.tsx` | Download buttons |

## Implementation Details

### 1. Add Print Button to OfficeDocumentPreviewModal.tsx
Add a "Print" button in the footer that opens the document in Google Docs Viewer in a new tab (full browser window where user can Ctrl+P).

```typescript
const handlePrint = () => {
  // Open in Google Viewer in new tab for printing
  const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}`;
  window.open(printUrl, '_blank');
  toast.info('Use Ctrl+P (or Cmd+P) to print, then select "Save as PDF"');
};
```

### 2. Add Print Button to QuoteViewRoute.tsx (lines 80-103)
Add a Printer icon button alongside the existing DOCX/PDF download buttons in the contract display.

### 3. Add Print Button to QuoteForm.tsx (lines 1170-1200)
Add a Printer icon button in the contract actions section (where Eye and Download buttons are).

### 4. Add Print Button to ContractsListView.tsx (lines 98-116)
Add a Printer icon button in the actions column of the contracts table.

### 5. Update ContractGenerationModal.tsx
Remove the PDF and "Both" output format options since server-side PDF generation is not implemented. This simplifies the UI to DOCX-only with a print option.

### 6. Update ContractGenerationSuccess.tsx
Replace the non-functional PDF download button with "Open for Print / Save as PDF" button.

## UI Changes

### Button Appearance
- Icon: `Printer` from lucide-react
- Tooltip: "Print / Save as PDF"
- Size: Consistent with existing action buttons (sm/icon)

### User Flow
1. User clicks Print button
2. Document opens in Google Docs Viewer in new tab
3. User presses Ctrl+P (or Cmd+P on Mac)
4. User selects "Save as PDF" as printer destination
5. High-quality PDF is saved locally

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/OfficeDocumentPreviewModal.tsx` | Add Print button in footer, add `handlePrint` function |
| `src/components/project-routes/QuoteViewRoute.tsx` | Add Printer button to contract row (line ~90) |
| `src/components/QuoteForm.tsx` | Add Printer button to contract actions (line ~1195) |
| `src/components/contracts/ContractsListView.tsx` | Add Printer button to actions column (line ~107) |
| `src/components/contracts/ContractGenerationModal.tsx` | Remove PDF/Both format options, simplify to DOCX |
| `src/components/contracts/ContractGenerationSuccess.tsx` | Replace PDF button with Print button |

## Benefits
- No external API dependencies or costs
- Works on all modern browsers and devices
- High-quality PDF output (browser/OS handles conversion)
- Familiar workflow for users (print dialog is universal)
- Simple implementation leveraging existing Google Viewer infrastructure
