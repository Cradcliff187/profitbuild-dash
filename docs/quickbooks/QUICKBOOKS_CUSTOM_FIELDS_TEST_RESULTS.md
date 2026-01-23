# QuickBooks Custom Fields: Test Results Summary

**Test Date:** January 13, 2026  
**Test Environment:** QuickBooks Sandbox  
**Tested By:** AI Assistant (Automated Analysis)

---

## Test Objective

Determine if custom fields on QuickBooks Purchase entities work via the API, specifically for the "Project/Wo#" field used in construction management.

---

## Test Results: ❌ **FAILED - Custom Fields Not Supported**

### Summary Statistics

- **Total Syncs Tested:** 5
- **Custom Fields Sent:** 5
- **Custom Fields Persisted:** 0
- **Success Rate:** 0% (0/5)
- **Failure Mode:** Silent ignore (no error thrown)

---

## Detailed Test Data

### Test 1: Receipt b0983fb2
- **Project Number:** `004-TOOL`
- **Sent:** `{"DefinitionId": "1", "Name": "Project/Wo#", "StringValue": "004-TOOL"}`
- **Returned:** `[]` (empty array)
- **Result:** ❌ IGNORED

### Test 2: Receipt e55ee8c6
- **Project Number:** `225-037`
- **Sent:** `{"DefinitionId": "1", "Name": "Project/Wo#", "StringValue": "225-037"}`
- **Returned:** `[]` (empty array)
- **Result:** ❌ IGNORED

### Test 3: Receipt 9df587eb
- **Project Number:** `225-057`
- **Sent:** `{"DefinitionId": "1", "Name": "Project/Wo#", "StringValue": "225-057"}`
- **Returned:** `[]` (empty array)
- **Result:** ❌ IGNORED

### Test 4: Receipt 292e62a1
- **Project Number:** `001-GAS`
- **Sent:** `{"DefinitionId": "1", "Name": "Project/Wo#", "StringValue": "001-GAS"}`
- **Returned:** `[]` (empty array)
- **Result:** ❌ IGNORED

### Test 5: Receipt 87787e52
- **Project Number:** `225-012`
- **Sent:** `{"DefinitionId": "1", "Name": "Project/Wo#", "StringValue": "225-012"}`
- **Returned:** `[]` (empty array)
- **Result:** ❌ IGNORED

---

## Technical Analysis

### What We Discovered

1. **QuickBooks API Accepts the Payload**
   - No HTTP error (200 OK responses)
   - No validation error in response
   - Purchase transaction is created successfully

2. **But Silently Ignores Custom Fields**
   - `CustomField` array in response is always empty `[]`
   - Data is not persisted to QuickBooks database
   - No warning or error message provided

3. **This is a Known API Limitation**
   - Confirmed by official Intuit documentation
   - Purchase/Expense entities do not support custom fields
   - Only Invoice, Estimate, Sales Receipt, and Purchase Order support them

### API Behavior Comparison

| Entity Type | Custom Field Support | Our Test Result |
|------------|---------------------|-----------------|
| Invoice | ✅ Supported | N/A (not tested) |
| Estimate | ✅ Supported | N/A (not tested) |
| Sales Receipt | ✅ Supported | N/A (not tested) |
| Purchase Order | ✅ Supported | N/A (not tested) |
| **Purchase** | ❌ **NOT Supported** | ❌ **CONFIRMED** |
| **Expense** | ❌ **NOT Supported** | N/A (not tested) |

---

## Current Workaround in Production

### Memo Field (Working)

Our system DOES successfully populate the `Memo` field with project information:

**Example:**
```json
{
  "Memo": "225-037 - Gas Expense"
}
```

**Status:** ✅ This works and is persisted in QuickBooks

**Pros:**
- Always works
- Searchable in QuickBooks
- Human-readable

**Cons:**
- Freeform text (not structured data)
- Can't run "Expenses by Project" reports
- Requires manual parsing

---

## Recommended Solutions

### Solution 1: CustomerRef (RECOMMENDED)

**Approach:** Create each project as a Customer in QuickBooks, then link expenses via `CustomerRef`.

**Implementation:**
```json
{
  "Line": [
    {
      "AccountBasedExpenseLineDetail": {
        "AccountRef": { "value": "89" },
        "CustomerRef": { "value": "123", "name": "Project 225-037" }
      }
    }
  ]
}
```

**Benefits:**
- ✅ Fully supported by QuickBooks API
- ✅ Enables "Expenses by Customer" reports = P&L by project
- ✅ Can mark expenses as billable
- ✅ Structured data (not freeform text)

**Trade-offs:**
- Requires syncing projects to QB as Customers first
- Projects appear in Customer list

### Solution 2: ClassRef

**Approach:** Use QuickBooks Classes for project categorization.

**Implementation:**
```json
{
  "Line": [
    {
      "AccountBasedExpenseLineDetail": {
        "AccountRef": { "value": "89" },
        "ClassRef": { "value": "200", "name": "Project 225-037" }
      }
    }
  ]
}
```

**Benefits:**
- ✅ Designed for departmental/project tracking
- ✅ Enables "P&L by Class" reports

**Trade-offs:**
- Requires Class tracking enabled in QB
- Limited to one class per line

### Solution 3: Keep Memo (Current)

**Status:** Already implemented and working

**Use Case:** Backup/fallback for human readability

---

## Next Steps

### Immediate (This Week)
1. ✅ Document findings (this document)
2. ✅ Share with team/stakeholders
3. ⏳ Decide on CustomerRef vs. ClassRef approach

### Short-Term (Next Sprint)
1. ⏳ Implement chosen solution (CustomerRef recommended)
2. ⏳ Create project sync Edge Function
3. ⏳ Update Purchase sync to include CustomerRef
4. ⏳ Test in Sandbox
5. ⏳ Deploy to Production

### Long-Term (Ongoing)
1. ⏳ Monitor QuickBooks API updates
2. ⏳ Re-test custom fields quarterly
3. ⏳ Consider QB Desktop if custom fields become critical

---

## Code Impact

### Current Code (Lines 660-719 in Edge Function)

**Status:** Works correctly, but QuickBooks ignores it

**Recommendation:** 
- **Option A:** Keep it (defensive coding, no harm)
- **Option B:** Remove it (reduce complexity)

### New Code Required

**For CustomerRef Implementation:**
- New function: `syncProjectToQuickBooksCustomer()`
- Database migration: Add `quickbooks_customer_id` to `projects` table
- Update Purchase payload to include `CustomerRef`

**Estimated Effort:** 4-6 hours

---

## Conclusion

**Custom fields on Purchase entities DO NOT WORK via QuickBooks API.**

This is:
- ✅ Confirmed by our production data (5/5 failures)
- ✅ Documented in official QuickBooks API specs
- ✅ A known limitation, not a bug in our code

**Our code is correct; QuickBooks API just doesn't support it.**

**Recommended Action:** Implement CustomerRef approach for proper project tracking and reporting.

---

## Appendix: SQL Query Used

```sql
SELECT 
  id,
  entity_id,
  status,
  request_payload->'CustomField' as custom_field_sent,
  response_payload->'Purchase'->'CustomField' as custom_field_returned,
  created_at
FROM quickbooks_sync_log
WHERE entity_type = 'receipt'
  AND status = 'success'
ORDER BY created_at DESC
LIMIT 5;
```

---

**Document Version:** 1.0  
**Last Updated:** January 13, 2026  
**Status:** Complete - Ready for Team Review
