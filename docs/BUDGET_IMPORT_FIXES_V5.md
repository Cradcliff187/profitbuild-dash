# Budget Sheet Import - Version 5 Fixes

## Critical Issues Fixed

### Issue 1: Compound Row Material Splitting (MAJOR BUG)
**Problem:** AI was duplicating labor amounts instead of using material amounts
- Demo row: Creating "Demo Split (Management)" with $15,000 instead of "Demo - Materials" with $6,000
- This caused $9,000+ cost overages per compound row

**Fix:** Complete rewrite of compound row instructions with:
- Explicit step-by-step logic
- Concrete JSON examples showing exact expected output
- Clear warning: "Labor item uses ONLY Column X amount, Materials item uses ONLY Column Y amount"
- Example showing Demo with Labor=$15,000 and Material=$6,000 splitting correctly

### Issue 2: Wrong Category Assignment
**Problem:** AI assigning "management" to material splits
- Should only use "management" for RCG labor with 0% markup (Supervision)
- Was incorrectly using it for material portions of compound rows

**Fix:** Added explicit category assignment rules section:
```
The "materials" category is for:
  • ANY row with Column X (Material) > $0
  • Material splits from compound rows (description ends with " - Materials")
  • NEVER use "management" for material items
  • NEVER use "labor_internal" for material items
```

### Issue 3: Post-Processing Overwrites
**Problem:** Post-processing recalculated ALL labor_internal items
- This broke lump sum labor items (unit=LS)
- Only hourly RCG labor (unit=HR) should be recalculated

**Fix:** Updated post-processing logic:
```typescript
if (validation.fixed.category === 'labor_internal' && validation.fixed.unit === 'HR') {
  // Only recalculate hourly RCG labor
  validation.fixed.costPerUnit = laborBillingRate;
  // ... recalculate
} else if (validation.fixed.category === 'labor_internal' && validation.fixed.unit === 'LS') {
  // Preserve lump sum labor values from Budget Sheet
  console.log('→ Preserved lump sum labor');
}
```

### Issue 4: Missing Validation
**Problem:** No way to detect when totals don't match Budget Sheet
- Errors went unnoticed until manual comparison

**Fix:** Added comprehensive validation logging:
- Logs calculated total cost vs expected $484,549
- Logs calculated total price vs expected $594,413
- Shows delta for each
- Adds warnings if difference > $100

### Issue 5: Insufficient Debugging
**Problem:** Couldn't see what AI was actually returning
- Made debugging impossible

**Fix:** Added detailed logging:
- Full AI JSON response logged
- Each line item logged during processing
- Cost/price for each item shown
- Category assignment logged with rationale

## Expected Results

### Line Items (15-16 total)
1. **Ceilings** - Subcontractor: $24,970 → $31,212.50
2. **Flooring** - Subcontractor: $26,288 → $32,860
3. **Demo (Labor)** - Labor Internal: 200 HR × $75 = $15,000 → $18,750
4. **Demo - Materials** - Materials: 1 LS × $6,000 = $6,000 → $7,500
5. **Framing** - Materials: $10,000 → $12,500
6. **Framing - Subcontractor** - Subcontractor: $27,000 → $33,750
7. **Electric/Fire Alarm/Data** - Subcontractor: $107,000 → $133,750
8. **Fire Protection** - Subcontractor: $15,000 → $18,750
9. **Paint** - Subcontractor: $9,800 → $12,250
10. **Doors/Frames/Hardware (Labor)** - Labor Internal: 20 HR × $75 = $1,500 → $1,875
11. **Doors/Frames/Hardware - Materials** - Materials: $25,000 → $31,250
12. **Casework** - Subcontractor: $40,575 → $50,718.75
13. **Plumbing** - Subcontractor: $63,323 → $79,153.75
14. **HVAC** - Subcontractor: $68,000 → $85,000
15. **Supervision** - Management: $45,093 → $45,093 (0% markup)

### Totals
- **Total Cost**: $484,549.00 ✓
- **Total Price**: $594,413.00 ✓
- **Margin**: $109,864.00 (18.48%) ✓
- **Labor Cushion**: $8,000 (200 HR Demo + 20 HR Doors = 220 HR × $40/hr)

## Changes Made

### Frontend: `src/services/estimateImportService.ts`
- Lines 30-135: Dynamic column mapping (already completed)
- Lines 206-259: Compound row detection using dynamic columns
- No additional changes needed

### Backend: `supabase/functions/parse-estimate-import/index.ts` (Version 5)
- **Lines 170-171**: Added full AI response logging
- **Lines 175**: Added per-item processing logs
- **Lines 178-190**: Fixed post-processing to only recalculate HR labor
- **Lines 212-236**: Added validation check comparing to Budget Sheet totals
- **Lines 324-397**: Completely rewrote compound row splitting with concrete example
- **Lines 399-413**: Updated triple compound logic
- **Lines 452-472**: Added explicit category assignment rules
- **Lines 491-500**: Added "NO DUPLICATE AMOUNTS" warning section

## Testing Instructions

1. **Upload Budget Sheet CSV**
2. **Check Console Logs** (Supabase Dashboard → Edge Functions → Logs):
   - Should show "AI returned: 15 items" or "16 items"
   - Should show validation check with deltas near $0
   - Should show each item being processed with correct categories
3. **Verify Import Screen**:
   - Should show 15-16 items
   - Demo should have TWO items (labor + materials split)
   - Doors/Frames/Hardware should have TWO items (labor + materials split)
   - Framing should have TWO items (materials + subcontractor split)
   - Total cost = $484,549.00
   - Total price = $594,413.00

## Debugging

If totals still don't match, check logs for:
1. "Demo - Materials" with costPerUnit=6000 (not 15000)
2. "Doors/Frames/Hardware - Materials" with costPerUnit=25000 (not 1500)
3. Each subcontractor item should have correct amounts
4. Validation section shows exact delta

## Deployment Status

- Frontend: Local (ready)
- Backend: Version 5 deployed to Supabase ✓
- Status: ACTIVE ✓
- Ready to test immediately
