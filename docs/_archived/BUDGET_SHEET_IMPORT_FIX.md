# Budget Sheet Import Fix - Summary

## Problem
The scope of work (Proposal) and Budget Sheet were always on different sheets/files. The import system needed to be focused exclusively on Budget Sheet format, with clear error messages when users tried to upload Proposal files.

## Files Modified

### 1. `src/services/estimateImportService.ts`
**Changes:**
- Removed 'proposal' from `DetectedFormat` type (now only 'budget_sheet' | 'unknown')
- Removed `scopeOfWorkText` field from `FormatDetectionResult` interface
- Improved `detectFormat()` function:
  - Better whitespace handling for header detection
  - Improved 'Sub' column detection (exact match)
  - Added better logging with ✓/✗ symbols
  - Added helpful error message listing expected columns
- Enhanced `parseEstimateFromCSV()` function:
  - Added validation that Budget Sheet format was detected
  - Throws clear error if wrong format: "This file does not appear to be a Budget Sheet. Please upload a file with columns: Item, Subcontractor, Labor, Material, Sub, Total, Markup. Note: Scope of Work / Proposal files are not supported - use the Budget Sheet only."
  - Added more detailed logging
- Updated STOP_MARKERS:
  - Removed 'supervision' (it's a valid line item, not a stop marker)
  - Added 'total contract' and 'total subcontractor'
  - Added comments explaining each marker

### 2. `src/components/estimates/ImportEstimateModal.tsx`
**Changes:**
- Updated dialog description to clarify required columns
- Added visual info box in upload area:
  - "Budget Sheet Format Required"
  - "Upload the Budget Sheet only (not Proposal/Scope of Work)"
- Enhanced format detection badge:
  - Green badge with checkmark when Budget Sheet is detected
  - "Budget Sheet Format Detected" message

### 3. `src/types/importTypes.ts`
**Changes:**
- Removed `scopeOfWork` field from `AIParseResult` interface
- Changed `detectedFormat` type from `'budget_sheet' | 'proposal'` to `'budget_sheet'` only
- Added comment: "Format detected (Budget Sheet only)"

### 4. `supabase/functions/parse-estimate-import/index.ts`
**Changes:**
- Enhanced compound row splitting logic to properly handle RCG labor:
  - When both Labor and Material columns have values
  - Correctly categorizes RCG labor as 'labor_internal' with hours OR 'management' based on markup
  - Calculates quantity as (Labor amount ÷ billing rate) for RCG labor with markup
- Improved single-column labor logic:
  - Clear distinction between RCG management (0% markup) and RCG labor (>0% markup)
  - Handles non-RCG labor items
- Enhanced critical rules in prompt:
  - Skip rows with "Total", "Contingency", or summary text
  - Clear parsing instructions for percentages and currency
  - Note about checking both Subcontractor name AND markup for RCG items

## Expected Budget Sheet Format

The system now expects files with these **exact columns**:
1. **Item** - Description of the line item
2. **Subcontractor** - Company name (or "RCG" for internal)
3. **Labor** - Labor cost amount
4. **Material** - Material cost amount
5. **Sub** - Subcontractor cost amount
6. **Total** - Sum of Labor + Material + Sub
7. **Markup** - Markup percentage (e.g., "25.00%")
8. **Total with Mark Up** - Final price after markup

## Handling Different Item Types

### 1. RCG Labor with Markup (Labor > 0, Markup > 0%)
- **Category:** labor_internal
- **Quantity:** Labor amount ÷ billing rate (converted to hours)
- **Unit:** HR
- **Cost Per Unit:** billing rate
- **Labor Hours:** Same as quantity

### 2. RCG Management (Labor > 0, Markup = 0%)
- **Category:** management
- **Quantity:** 1
- **Unit:** LS
- **Cost Per Unit:** Labor amount

### 3. Subcontractor Only (Sub > 0)
- **Category:** subcontractor
- **Quantity:** 1
- **Unit:** LS
- **Cost Per Unit:** Sub amount

### 4. Materials Only (Material > 0)
- **Category:** materials
- **Quantity:** 1
- **Unit:** LS
- **Cost Per Unit:** Material amount

### 5. Compound Rows (Multiple columns > 0)
- **Splits into multiple line items**
- Each gets `wasSplit: true` and `splitFrom: "original item name"`
- Example: Demo with Labor=$15,000 and Material=$6,000
  - Creates "Demo" (labor_internal)
  - Creates "Demo - Materials" (materials)

## Stop Markers

The parser stops when it encounters these markers in the Item column:
- `expenses` - Start of expenses section
- `rcg labor` - RCG labor breakdown
- `total cost` - Total cost summary
- `total contract` - Total contract summary
- `subcontractor expenses` - Subcontractor tracking
- `total expenses` - Total expenses summary
- `total subcontractor` - Subcontractor totals

## Testing

To test with your example files:
1. ✅ Upload `225-005 UC Neuro Suite 301 - Copy of Budget Sheet.csv` - Should work correctly
2. ❌ Upload `225-005 UC Neuro Suite 301 - Proposal.csv` - Should show clear error message

## Error Messages

### Wrong File Format
```
This file does not appear to be a Budget Sheet. 
Please upload a file with columns: Item, Subcontractor, Labor, Material, Sub, Total, Markup. 
Note: Scope of Work / Proposal files are not supported - use the Budget Sheet only.
```

### Empty File
```
File appears empty or only contains headers.
```

### AI Service Issues
- Rate limited: "Rate limit exceeded. Please wait and retry."
- Not configured: "AI service not configured."

## Benefits

1. **Clear User Guidance** - Users know exactly what format to upload
2. **Better Error Messages** - Specific error when wrong file type is uploaded
3. **Robust Detection** - Improved header detection with whitespace handling
4. **Accurate Parsing** - Correct handling of RCG labor vs management
5. **Visual Feedback** - Green badge confirms correct format was detected
