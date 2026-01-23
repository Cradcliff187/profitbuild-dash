# QuickBooks CustomerRef Implementation Guide

## Overview

This document describes the implementation of project tracking in QuickBooks using the **CustomerRef** approach with sub-customers (jobs). This solution addresses the limitation that custom fields are not supported for Purchase entities in QuickBooks.

## Architecture

### Database Schema

The implementation uses existing database columns:

- **`clients.quickbooks_customer_id`**: Stores the QuickBooks Customer ID for the parent customer
- **`projects.quickbooks_job_id`**: Stores the QuickBooks Customer ID for the project (sub-customer)

### QuickBooks Data Model

```
QuickBooks Customers List:

▼ ABC Construction Co. (Parent Customer)
  ├─ 225-037 Roof Repair (Sub-Customer/Job)
  ├─ 225-057 Kitchen Remodel (Sub-Customer/Job)
  └─ 225-089 Deck Addition (Sub-Customer/Job)

▼ XYZ Property Management (Parent Customer)
  ├─ 001-GAS Fuel Expenses (Sub-Customer/Job)
  └─ 004-TOOL Equipment Rental (Sub-Customer/Job)
```

## Edge Functions

### 1. quickbooks-sync-customer

**Purpose**: Syncs a client from the RCG Work database to QuickBooks as a parent Customer.

**Endpoint**: `/functions/v1/quickbooks-sync-customer`

**Request**:
```json
{
  "clientId": "uuid",
  "dryRun": false
}
```

**Response**:
```json
{
  "success": true,
  "quickbooks_customer_id": "123",
  "customer_name": "ABC Construction Co.",
  "client": {
    "id": "uuid",
    "name": "ABC Construction Co."
  },
  "duration_ms": 1234
}
```

**Features**:
- Creates a QuickBooks Customer with company name, email, phone, and billing address
- Stores the QuickBooks Customer ID in `clients.quickbooks_customer_id`
- Logs all sync operations to `quickbooks_sync_log` table
- Supports dry run mode for previewing payloads

### 2. quickbooks-sync-project

**Purpose**: Syncs a project from the RCG Work database to QuickBooks as a sub-customer (job) under the parent customer.

**Endpoint**: `/functions/v1/quickbooks-sync-project`

**Request**:
```json
{
  "projectId": "uuid",
  "dryRun": false
}
```

**Response**:
```json
{
  "success": true,
  "quickbooks_job_id": "456",
  "customer_name": "225-037 Roof Repair",
  "parent_customer_id": "123",
  "project": {
    "id": "uuid",
    "number": "225-037",
    "name": "Roof Repair"
  },
  "duration_ms": 1234
}
```

**Features**:
- Creates a QuickBooks Customer with `ParentRef` pointing to the parent customer
- Stores the QuickBooks Customer ID in `projects.quickbooks_job_id`
- Validates that the parent customer is synced before creating the sub-customer
- Logs all sync operations to `quickbooks_sync_log` table
- Supports dry run mode for previewing payloads

### 3. quickbooks-sync-receipt (Updated)

**Purpose**: Syncs an approved receipt to QuickBooks as a Purchase transaction, linking it to the project via `CustomerRef`.

**Endpoint**: `/functions/v1/quickbooks-sync-receipt`

**Request**:
```json
{
  "receiptId": "uuid",
  "accountId": "89",
  "paymentType": "CreditCard",
  "dryRun": false
}
```

**Key Changes**:
1. Added `projects.quickbooks_job_id` to the receipt query
2. Added `CustomerRef` to the line item detail if project is synced:

```typescript
const lineDetail: any = {
  AccountRef: expenseAccountRef.value 
    ? { value: expenseAccountRef.value, name: expenseAccountRef.name }
    : { name: expenseAccountRef.name },
};

// Add CustomerRef for project tracking (if project is synced to QB)
if (receipt.projects?.quickbooks_job_id) {
  lineDetail.CustomerRef = { value: receipt.projects.quickbooks_job_id };
  console.log(`🔗 Linking expense to project (QB Customer ID: ${receipt.projects.quickbooks_job_id})`);
}
```

**QuickBooks Purchase Payload**:
```json
{
  "PaymentType": "CreditCard",
  "AccountRef": {
    "value": "42",
    "name": "Visa Credit Card"
  },
  "TotalAmt": 450.00,
  "TxnDate": "2026-01-13",
  "PrivateNote": "RCG Work Receipt ID: uuid",
  "Line": [
    {
      "Amount": 450.00,
      "DetailType": "AccountBasedExpenseLineDetail",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": {
          "value": "89",
          "name": "Cost of Goods Sold"
        },
        "CustomerRef": {
          "value": "456"  // ← Project's QB sub-customer ID
        }
      },
      "Description": "Receipt from Home Depot"
    }
  ],
  "EntityRef": {
    "value": "67",
    "name": "Home Depot",
    "type": "Vendor"
  },
  "Memo": "225-037 - Roof Repair"
}
```

## Workflow

### Initial Setup

1. **Sync Client to QuickBooks**:
   - User selects a client in the UI
   - Clicks "Sync to QuickBooks"
   - Edge Function creates parent Customer in QuickBooks
   - `clients.quickbooks_customer_id` is populated

2. **Sync Project to QuickBooks**:
   - User selects a project in the UI
   - Clicks "Sync to QuickBooks"
   - Edge Function validates parent customer is synced
   - Edge Function creates sub-customer in QuickBooks with `ParentRef`
   - `projects.quickbooks_job_id` is populated

### Receipt Sync

3. **Sync Receipt to QuickBooks**:
   - User approves a receipt
   - User clicks "Send to QuickBooks"
   - User selects expense account and payment type
   - Edge Function creates Purchase transaction
   - **If project is synced**: `CustomerRef` is added to line item, linking expense to project
   - **If project is not synced**: Expense is created without `CustomerRef` (still valid)

## Benefits

### For Users

1. **Hierarchical Organization**:
   - Customers are grouped with their projects
   - Easy to find all projects for a specific customer

2. **Flexible Reporting**:
   - **By Customer**: See total expenses across all projects for a customer
   - **By Project**: See expenses for a specific project
   - **By Customer + Project**: Hierarchical view with rollups

3. **Job Costing**:
   - Run Profit & Loss by Customer to see profitability by project
   - Track expenses, revenue, and margins for each project

4. **Invoicing**:
   - Mark project expenses as billable
   - Invoice the parent customer for project expenses

### For QuickBooks

1. **Native Feature**:
   - Sub-customers (jobs) are a standard QuickBooks feature
   - No workarounds or hacks required

2. **Reliable**:
   - Unlike custom fields, `CustomerRef` is fully supported for Purchase entities
   - No silent failures or data loss

3. **Flexible**:
   - Can be used with or without parent customers
   - Projects can be standalone if needed

## QuickBooks Reports

### Expenses by Customer Report

```
Expenses by Customer Report

ABC Construction Co.              Total: $12,450.00
  ├─ 225-037 Roof Repair         $8,920.00
  ├─ 225-057 Kitchen Remodel     $2,850.00
  └─ 225-089 Deck Addition         $680.00

XYZ Property Management           Total: $3,200.00
  ├─ 001-GAS Fuel Expenses       $2,450.00
  └─ 004-TOOL Equipment Rental     $750.00
```

### Profit & Loss by Customer

```
ABC Construction Co.
├─ Total All Projects: $12,450.00
│
├─ 225-037 Roof Repair: $8,920.00
│  ├─ Materials: $6,200.00
│  └─ Labor: $2,720.00
│
├─ 225-057 Kitchen Remodel: $2,850.00
│  └─ Materials: $2,850.00
```

### Customer Profile

Each project (sub-customer) has its own profile in QuickBooks showing:
- All transactions (expenses, invoices, payments)
- Total balance
- Contact information
- Notes

## Implementation Checklist

- [x] Database columns exist (`clients.quickbooks_customer_id`, `projects.quickbooks_job_id`)
- [x] Edge Function: `quickbooks-sync-customer` created
- [x] Edge Function: `quickbooks-sync-project` created
- [x] Edge Function: `quickbooks-sync-receipt` updated with `CustomerRef`
- [ ] Deploy Edge Functions to Supabase
- [ ] Frontend: Add "Sync to QuickBooks" button for clients
- [ ] Frontend: Add "Sync to QuickBooks" button for projects
- [ ] Frontend: Show sync status indicators
- [ ] Testing: Sync client in Sandbox
- [ ] Testing: Sync project in Sandbox
- [ ] Testing: Sync receipt with project link in Sandbox
- [ ] Testing: Verify reports in QuickBooks Sandbox

## Error Handling

### Parent Customer Not Synced

If a project sync is attempted before the parent customer is synced:

```json
{
  "error": "Parent customer not synced",
  "message": "Please sync the client to QuickBooks first before syncing the project",
  "client_id": "uuid",
  "client_name": "ABC Construction Co."
}
```

**Resolution**: Sync the client first, then sync the project.

### Project Not Synced (Receipt Sync)

If a receipt is synced for a project that hasn't been synced to QuickBooks:
- The expense is created successfully
- `CustomerRef` is omitted from the payload
- The expense is not linked to a project in QuickBooks
- The `Memo` field still contains the project number for reference

**Resolution**: This is a valid scenario. Projects can be synced later if needed.

## Security

- All Edge Functions require authentication
- Admin role required for customer and project sync
- Receipt sync requires approved receipt
- Feature flag check: `quickbooks_integration` must be enabled
- All operations are logged to `quickbooks_sync_log` table

## Logging

All sync operations are logged to the `quickbooks_sync_log` table with:
- `entity_type`: 'client', 'project', or 'receipt'
- `entity_id`: UUID of the entity
- `sync_type`: 'export'
- `status`: 'success' or 'failed'
- `quickbooks_id`: QuickBooks entity ID (if successful)
- `request_payload`: JSON payload sent to QuickBooks
- `response_payload`: JSON response from QuickBooks
- `initiated_by`: User ID
- `duration_ms`: Time taken for the operation
- `environment`: 'sandbox' or 'production'
- `error_message`: Error message (if failed)

## Next Steps

1. **Deploy Edge Functions**: Use Supabase MCP to deploy all three functions
2. **Create Frontend UI**: Add sync buttons and status indicators
3. **Test in Sandbox**: Verify the complete workflow
4. **User Documentation**: Create user-facing guide for syncing workflow
5. **Production Deployment**: Deploy to production after successful testing

## Comparison: Custom Fields vs CustomerRef

| Feature | Custom Fields | CustomerRef (Sub-Customers) |
|---------|---------------|----------------------------|
| **Support for Purchase** | ❌ Not supported (silently ignored) | ✅ Fully supported |
| **Data Integrity** | ❌ Data loss risk | ✅ Reliable |
| **Reporting** | ❌ Limited | ✅ Comprehensive (P&L by Customer, Expenses by Customer) |
| **Job Costing** | ❌ Not available | ✅ Native QuickBooks feature |
| **Invoicing** | ❌ Cannot mark as billable | ✅ Can mark expenses as billable |
| **Hierarchy** | ❌ Flat structure | ✅ Parent/child relationships |
| **Search** | ❌ Not searchable | ✅ Searchable by customer/project |
| **Implementation** | ⚠️ Requires workarounds | ✅ Standard QuickBooks workflow |

## Conclusion

The CustomerRef approach with sub-customers is the **recommended solution** for project tracking in QuickBooks. It provides:
- **Reliability**: No silent failures or data loss
- **Flexibility**: Works with existing customer relationships
- **Power**: Enables job costing, detailed reporting, and billable expense tracking
- **Simplicity**: Uses standard QuickBooks features without workarounds

This implementation preserves your real customer relationships while providing robust project tracking and financial reporting capabilities.
