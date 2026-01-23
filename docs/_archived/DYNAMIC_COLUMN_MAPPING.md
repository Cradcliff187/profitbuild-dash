# Dynamic Column Mapping for Budget Sheet Import

## Problem Solved
Budget sheets in the real world can have:
- Extra columns (e.g., "Profit", "Notes")
- Different column ordering
- Slightly different column names
- Missing optional columns

The previous system assumed **fixed column positions**, which was brittle and would break if columns were rearranged or new ones added.

## Solution: Dynamic Column Detection

The system now **automatically detects where each required column is located** by analyzing the header row, then tells the AI exactly which columns to use.

### How It Works

1. **Header Detection** (`detectFormat`)
   - Scans first 20 rows looking for Budget Sheet headers
   - Calls `detectColumnMapping()` to find each column position
   
2. **Column Mapping** (`detectColumnMapping`)
   - Finds each required column by checking for variations:
     - **Item**: "item", "description", "line item"
     - **Subcontractor**: "subcontractor", "vendor", "supplier", "sub"  
     - **Labor**: "labor", "labour" (handles spelling variations)
     - **Material**: "material", "materials"
     - **Sub (cost)**: "sub" (exact 3-char match to avoid confusion with "subcontractor")
     - **Markup**: "markup", "margin"
   - Returns a `ColumnMapping` object with actual column indices

3. **Pass to AI** 
   - Column mapping sent to edge function as part of `hints`
   - AI prompt dynamically built using actual column numbers
   - Example: "Column 4 = Sub cost" instead of "Column E = Sub cost"

### Example Column Mapping

For your Budget Sheet:
```json
{
  "item": 0,
  "subcontractor": 1,
  "labor": 2,
  "material": 3,
  "sub": 4,
  "total": 5,
  "markup": 6
}
```

If someone adds a "Notes" column at position 1, the system adapts:
```json
{
  "item": 0,
  "subcontractor": 2,  // Shifted right
  "labor": 3,          // Shifted right
  "material": 4,       // Shifted right
  "sub": 5,            // Shifted right
  "total": 6,          // Shifted right
  "markup": 7          // Shifted right
}
```

## Benefits

1. **Resilient to Changes** - Handles column order changes
2. **Flexible Naming** - Accepts common variations ("vendor" vs "subcontractor")
3. **Extra Columns OK** - Ignores additional columns (like "Profit")
4. **Clear Error Messages** - If required column missing, shows which one
5. **Better Debugging** - Logs actual column mapping used

## Files Modified

### Frontend (`src/services/estimateImportService.ts`)
- Added `ColumnMapping` interface
- Added `detectColumnMapping()` function
- Updated `detectFormat()` to return column mapping
- Updated `analyzeRowsForSplitting()` to use dynamic columns
- Pass `columnMapping` to edge function

### Backend (`supabase/functions/parse-estimate-import/index.ts`)
- Receive `columnMapping` from hints
- Updated `buildBudgetSheetPrompt()` to use actual column indices
- AI prompt now says "Column 4 = Sub" instead of "Column E = Sub"
- All parsing instructions use dynamic column references

## Testing

The system now handles these variations:
- ✅ Standard column order
- ✅ Extra columns inserted
- ✅ Columns in different order
- ✅ Alternate column names ("vendor" instead of "subcontractor")
- ✅ Case-insensitive headers

## Future Enhancements

Could add support for:
- Optional columns (notes, vendor contact, etc.)
- Multiple subcontractor cost columns
- Split labor into multiple types (skilled vs general)
- Custom user-defined column mappings
