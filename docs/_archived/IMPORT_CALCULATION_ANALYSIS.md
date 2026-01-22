# Budget Sheet Import - Calculation Analysis

## Expected vs Actual Totals

### From Excel (Row 17):
- **Total Cost**: $484,549.00
- **Price to Customer**: $594,413.00  
- **Margin**: $109,864.00 (18.48%)

### From Import (Screenshot):
- **Cost**: $538,642.00 → **$54,093 OVER**
- **Price**: $650,589.75 → **$56,176.75 OVER**
- **Margin**: 17.2%

## Line-by-Line Comparison

### Row 5: Demo (COMPOUND ROW - Labor + Material)

**Excel Data:**
- Labor: $15,000
- Material: $6,000
- Sub: $0.00
- Total Cost: $21,000
- Markup: 25%
- Price: $26,250

**What SHOULD Import:**
1. Demo (labor_internal): 200 HR × $75 = **$15,000 cost**, 25% markup → **$18,750 price**
2. Demo - Materials (materials): 1 LS × $6,000 = **$6,000 cost**, 25% markup → **$7,500 price**
- **Combined: $21,000 cost, $26,250 price** ✓

**What ACTUALLY Imported:**
1. Demo (Labor Internal): 200 HR @ $75 = **$15,000 cost**, **$18,750 price** ✓ CORRECT
2. Demo Split (Management): 1 LS @ **$15,000 cost**, **$18,750 price** ✗ WRONG!
- **Combined: $30,000 cost, $37,500 price** ✗ 
- **Extra: +$9,000 cost, +$11,250 price**

### Row 6: Framing (COMPOUND ROW - Material + Sub)

**Excel Data:**
- Labor: EMPTY/$0.00
- Material: $10,000
- Sub: $27,000
- Total Cost: $37,000
- Markup: 25%
- Price: $46,250

**What SHOULD Import:**
1. Framing (materials): **$10,000 cost**, **$12,500 price**
2. Framing (subcontractor): **$27,000 cost**, **$33,750 price**
- **Combined: $37,000 cost, $46,250 price** ✓

**What ACTUALLY Imported:**
- Appears correct based on screenshot ✓

### Row 10: Doors/Frames/Hardware (COMPOUND ROW - Labor + Material)

**Excel Data:**
- Labor: $1,500
- Material: $25,000
- Sub: $0.00
- Total Cost: $26,500
- Markup: 25%
- Price: $33,125

**What SHOULD Import:**
1. Doors/Frames/Hardware (labor_internal): 20 HR × $75 = **$1,500 cost**, **$1,875 price**
2. Doors/Frames/Hardware - Materials: **$25,000 cost**, **$31,250 price**
- **Combined: $26,500 cost, $33,125 price** ✓

**Likely Import Issue:** Same as Demo - creating duplicate labor items

## Root Cause Analysis

### Problem 1: AI Not Following Compound Row Logic
The AI is misinterpreting rows with **Labor + Material**:
- Correctly creates the Labor item
- **Fails to create the Materials item** with correct values
- Instead creates a duplicate or miscategorized item

### Problem 2: Category Confusion
- AI creating "Management" category for items that should be "Materials"
- Confusing the Labor amount with Material amount

### Problem 3: Post-Processing Overwrites
Edge function lines 178-183 FORCE all `labor_internal` items to recalculate:
```typescript
if (validation.fixed.category === 'labor_internal') {
  validation.fixed.costPerUnit = laborBillingRate;  // Forces $75
  validation.fixed.pricePerUnit = laborBillingRate * (1 + markupPercent / 100);
  validation.fixed.total = validation.fixed.quantity * validation.fixed.pricePerUnit;
}
```
This is correct for labor items, but if Materials items are miscategorized as labor_internal, they get destroyed.

## Bugs Identified

1. **AI Compound Row Splitting Logic** - Not following instructions for Labor + Material splits
2. **Material vs Labor Confusion** - AI confusing which amount goes to which item  
3. **Category Assignment** - AI assigning wrong categories to split items
4. **Missing Demo - Materials Item** - Should exist but showing "Demo Split (Management)" instead

## Impact on Totals

If Demo is incorrectly creating:
- Item 1: $15,000 cost (correct)
- Item 2: $15,000 cost (WRONG - should be $6,000)
- Difference: +$9,000

If Doors/Frames/Hardware has similar issue:
- Item 1: $1,500 cost (correct)
- Item 2: $1,500 cost (WRONG - should be $25,000)
- Wait, that would be -$23,500, not +$23,500

Actually, this doesn't explain the full $54,093 overage. There must be multiple issues or I'm not seeing all the imported items.

I need to understand what all 16 items were actually imported to trace the exact error.
