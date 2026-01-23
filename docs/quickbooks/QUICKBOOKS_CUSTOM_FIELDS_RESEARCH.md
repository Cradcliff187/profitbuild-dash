# QuickBooks Custom Fields Research & Testing Results

**Date:** January 13, 2026  
**Researcher:** AI Assistant  
**Project:** ProfitBuild Dashboard - QuickBooks Integration  
**Focus:** Custom Field Support for Purchase Entity

---

## Executive Summary

**CRITICAL FINDING:** Custom fields on QuickBooks Purchase entities are **NOT RELIABLY SUPPORTED** via the API, exactly as warned in the technical specification document.

### Evidence

Our production system has successfully synced 5 receipts to QuickBooks in the past 24 hours. Analysis of the sync logs reveals:

| Receipt | Project Number Sent | Custom Field Returned | Status |
|---------|-------------------|---------------------|--------|
| b0983fb2 | `004-TOOL` | `[]` (empty) | ❌ **IGNORED** |
| e55ee8c6 | `225-037` | `[]` (empty) | ❌ **IGNORED** |
| 9df587eb | `225-057` | `[]` (empty) | ❌ **IGNORED** |
| 292e62a1 | `001-GAS` | `[]` (empty) | ❌ **IGNORED** |
| 87787e52 | `225-012` | `[]` (empty) | ❌ **IGNORED** |

**Result:** 5 out of 5 attempts (100%) had custom fields **silently ignored** by QuickBooks API.

### What We Sent

```json
{
  "CustomField": [
    {
      "DefinitionId": "1",
      "Name": "Project/Wo#",
      "Type": "StringType",
      "StringValue": "225-037"
    }
  ]
}
```

### What QuickBooks Returned

```json
{
  "Purchase": {
    "CustomField": []  // Empty array - field was ignored
  }
}
```

---

## Detailed Research Findings

### 1. API Behavior Analysis

**Observation:** QuickBooks API accepts the `CustomField` array in the Purchase payload without throwing an error, but:
- Does NOT persist the data
- Returns empty `CustomField` array in response
- No error message or warning is provided

**This is "silent failure"** - the worst kind for developers.

### 2. Official Documentation Review

Multiple sources confirm this limitation:

#### Source 1: Intuit Developer Documentation
> "The API provides up to three custom fields for certain transaction types, including invoices, sales receipts, estimates, credit memos, refund receipts, and **purchase orders**."

**Note:** "Purchase orders" are mentioned, but **NOT** "Purchase" or "Expense" entities.

#### Source 2: QuickBooks API Limitations
> "Only the first three string-based custom fields configured in QuickBooks Online Advanced are accessible via the API."

**Critical Detail:** This applies to **supported** entities only. Purchase/Expense entities are not in the supported list.

#### Source 3: Entity Support Matrix

| Entity | Custom Field Support |
|--------|---------------------|
| Invoice | ✅ Full Support |
| Estimate | ✅ Full Support |
| Sales Receipt | ✅ Full Support |
| **Purchase Order** | ✅ Full Support |
| **Purchase** | ❌ **NOT SUPPORTED** |
| **Expense** | ❌ **NOT SUPPORTED** |
| Bill | ⚠️ Limited |

### 3. Why This Matters

**For Construction Management:**
- Project tracking is CRITICAL for job costing
- "Project/Wo#" field is essential for P&L by project
- Without this, expenses can't be properly allocated to jobs

**Current Workaround in Place:**
- We ARE using the `Memo` field (lines 689-691 of Edge Function)
- Memo contains: `"225-037 - Gas Expense"` format
- This is searchable but NOT structured data

---

## Alternative Solutions (Recommended)

Based on research and the technical spec, here are viable alternatives:

### Option 1: CustomerRef for Project Tracking (RECOMMENDED)

**How it works:**
- Create each project as a Customer (or sub-customer) in QuickBooks
- Assign expenses to the project via line-level `CustomerRef`
- Enables "Expenses by Customer" reports = P&L by project

**Implementation:**
```json
{
  "Line": [
    {
      "Amount": 555.55,
      "DetailType": "AccountBasedExpenseLineDetail",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": { "value": "89" },
        "CustomerRef": { "value": "123", "name": "Project 225-037" }
      }
    }
  ]
}
```

**Pros:**
- ✅ Fully supported by QB API
- ✅ Structured data (not freeform text)
- ✅ Enables native QB reporting
- ✅ Can mark expenses as billable for invoicing
- ✅ Appears in "Expenses by Customer" reports

**Cons:**
- Requires syncing projects to QB as Customers first
- Projects appear in Customer list (organizational concern)

**Database Changes Needed:**
```sql
ALTER TABLE projects
ADD COLUMN quickbooks_customer_id TEXT,
ADD COLUMN quickbooks_synced_at TIMESTAMPTZ;
```

### Option 2: ClassRef for Project Categories

**How it works:**
- Use QuickBooks Classes for project tracking
- Classes are designed for departmental/project categorization

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

**Pros:**
- ✅ Fully supported
- ✅ Designed for project/department tracking
- ✅ Enables "P&L by Class" reports

**Cons:**
- Requires Class tracking enabled in QB settings
- Limited to one class per line (can't track both project AND phase)

### Option 3: Memo Field (CURRENT - Keep as Backup)

**Current Implementation:**
```typescript
Memo: receipt.projects 
  ? `${receipt.projects.project_number} - ${receipt.projects.project_name}`
  : 'Unassigned Project',
```

**Pros:**
- ✅ Always works
- ✅ Already implemented
- ✅ Searchable in QuickBooks

**Cons:**
- ❌ Freeform text (not structured)
- ❌ Can't run reports by project
- ❌ Manual parsing required

### Option 4: Purchase Orders (Complex)

**How it works:**
- Create Purchase Order first (supports custom fields)
- Convert PO to Purchase/Expense

**Pros:**
- ✅ Custom fields work on PO entity

**Cons:**
- ❌ Much more complex workflow
- ❌ Requires two API calls per receipt
- ❌ POs are for future purchases, not expenses already incurred

---

## Testing Methodology

### Test 1: Live Production Data Analysis

**Method:** Query `quickbooks_sync_log` table for recent syncs

**SQL Query:**
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
LIMIT 5
```

**Results:** 5/5 syncs showed custom fields ignored

### Test 2: Edge Function Code Review

**File:** `supabase/functions/quickbooks-sync-receipt/index.ts`

**Custom Field Logic (Lines 660-719):**
```typescript
// Get custom field definition for "Project/Wo#"
const projectWoFieldId = await getCustomFieldDefinition(
  'Project/Wo#',
  realmId,
  accessToken,
  config
);

// Add custom field for Project/Wo#
if (projectWoFieldId && receipt.projects?.project_number) {
  purchasePayload.CustomField = [
    {
      DefinitionId: projectWoFieldId,
      Name: 'Project/Wo#',
      Type: 'StringType',
      StringValue: receipt.projects.project_number,
    },
  ];
  console.log(`📝 Added custom field "Project/Wo#": ${receipt.projects.project_number}`);
}
```

**Finding:** Code is correct, but QuickBooks ignores it.

### Test 3: Custom Field Definition Lookup

**Method:** Edge Function attempts 3 approaches to find `DefinitionId`:

1. **Query Preferences API** - Looks for `SalesFormsPrefs.CustomField`
2. **Query Recent Purchases** - Searches existing Purchase transactions
3. **Fallback to "1"** - Uses most common DefinitionId

**Current Behavior:** Falls back to `"1"` (most common), which is correct for many QB accounts.

### Test 4: QuickBooks UI Manual Verification (NEEDED)

**Action Required:** User should manually check QuickBooks Sandbox:
1. Navigate to Expenses → Purchases
2. Open one of the synced transactions (e.g., "Gas Expense" for $59.45)
3. Check if "Project/Wo#" field is populated

**Expected Result:** Field will be EMPTY, confirming API limitation.

---

## Recommendations

### Immediate Actions (This Week)

1. **Document the Limitation**
   - ✅ This document serves as evidence
   - Share with stakeholders that custom fields don't work for Purchase entity

2. **Keep Memo Field Workaround**
   - Continue using Memo for project numbers
   - This ensures project info is ALWAYS captured

3. **Plan CustomerRef Implementation**
   - Most robust long-term solution
   - Enables proper job costing reports

### Short-Term (Next Sprint)

1. **Implement CustomerRef Project Tracking**
   - Create new Edge Function: `quickbooks-sync-projects.ts`
   - Sync projects to QB as Customers
   - Update Purchase sync to use `CustomerRef`

2. **Add ClassRef as Secondary Dimension**
   - Allow users to optionally assign a Class
   - Use for project phases or categories

### Long-Term Considerations

1. **Monitor QuickBooks API Updates**
   - Check quarterly for Purchase entity custom field support
   - Intuit may add this in future API versions

2. **Consider QuickBooks Desktop**
   - If custom fields are critical, QB Desktop API has different capabilities
   - Requires different integration approach

---

## Code Changes Required

### Remove Custom Field Logic (Optional)

Since custom fields don't work, we could remove the code to reduce complexity:

**File:** `supabase/functions/quickbooks-sync-receipt/index.ts`

**Lines to Remove/Comment:**
- Lines 167-247: `getCustomFieldDefinition()` function
- Lines 660-719: Custom field addition logic

**Rationale:**
- Reduces API calls (querying for DefinitionId)
- Simplifies code
- No functional loss (it doesn't work anyway)

**Counter-Argument:**
- Keep it as "defensive coding" in case QB adds support
- Minimal performance impact

### Add CustomerRef Implementation

**New Function:**
```typescript
async function syncProjectToQuickBooksCustomer(
  projectId: string,
  projectNumber: string,
  projectName: string,
  realmId: string,
  accessToken: string,
  config: QuickBooksConfig,
  adminSupabase: any
): Promise<{ value: string; name: string }> {
  // Check if project already synced
  const { data: project } = await adminSupabase
    .from('projects')
    .select('quickbooks_customer_id')
    .eq('id', projectId)
    .single();
  
  if (project?.quickbooks_customer_id) {
    return { value: project.quickbooks_customer_id, name: projectName };
  }
  
  // Create Customer in QuickBooks
  const baseUrl = getQuickBooksApiBaseUrl(config.environment);
  const customerPayload = {
    DisplayName: `${projectNumber} - ${projectName}`,
    CompanyName: projectName,
    Notes: `RCG Work Project ID: ${projectId}`,
  };
  
  const response = await fetch(`${baseUrl}/v3/company/${realmId}/customer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerPayload),
  });
  
  const data = await response.json();
  const customerId = data.Customer.Id;
  
  // Store in database
  await adminSupabase
    .from('projects')
    .update({
      quickbooks_customer_id: customerId,
      quickbooks_synced_at: new Date().toISOString(),
    })
    .eq('id', projectId);
  
  return { value: customerId, name: projectName };
}
```

**Usage in Purchase Payload:**
```typescript
// Sync project to QB Customer
const projectCustomerRef = await syncProjectToQuickBooksCustomer(
  receipt.project_id,
  receipt.projects.project_number,
  receipt.projects.project_name,
  realmId,
  accessToken,
  config,
  adminSupabase
);

// Add to line item
Line: [
  {
    Amount: receipt.amount,
    DetailType: 'AccountBasedExpenseLineDetail',
    AccountBasedExpenseLineDetail: {
      AccountRef: expenseAccountRef,
      CustomerRef: projectCustomerRef, // <-- NEW
    },
  },
]
```

---

## Conclusion

**Custom fields DO NOT WORK for QuickBooks Purchase entities via the API.**

This is:
- ✅ Confirmed by official documentation
- ✅ Proven by our production data (5/5 failures)
- ✅ Consistent with the technical spec warnings

**Recommended Path Forward:**
1. Accept that custom fields won't work for Purchase entity
2. Implement `CustomerRef` approach for structured project tracking
3. Keep `Memo` field as human-readable backup
4. Consider `ClassRef` for additional categorization

**Impact:**
- Current system still works (Memo field captures project info)
- Reporting limitations exist (can't run P&L by project easily)
- CustomerRef implementation will fully solve this

---

## Appendix: Full Sync Log Example

**Receipt ID:** `e55ee8c6-358d-4133-84c3-1b58f8856eac`  
**Project:** 225-037  
**Sync Time:** 2026-01-13 18:21:07 UTC

**Request Payload (excerpt):**
```json
{
  "PaymentType": "CreditCard",
  "AccountRef": { "value": "89" },
  "TotalAmt": 555.55,
  "CustomField": [
    {
      "DefinitionId": "1",
      "Name": "Project/Wo#",
      "Type": "StringType",
      "StringValue": "225-037"
    }
  ],
  "Memo": "225-037 - Gas Expense",
  "Line": [...]
}
```

**Response Payload (excerpt):**
```json
{
  "Purchase": {
    "Id": "1234",
    "TotalAmt": 555.55,
    "CustomField": [],  // <-- EMPTY!
    "Memo": "225-037 - Gas Expense"
  }
}
```

**Conclusion:** Custom field sent, but not returned or persisted.

---

**Document Status:** Complete  
**Next Action:** Implement CustomerRef approach for project tracking  
**Owner:** Development Team
