# QuickBooks Online Purchase Entity API: Complete Technical Reference

The Purchase entity in QuickBooks Online supports three payment types (**Cash**, **Check**, **CreditCard**) with comprehensive field options, but **custom field support is severely limited**—a critical constraint for construction management apps requiring project tracking. Alternative approaches using CustomerRef, ClassRef, or Memo fields provide viable workarounds for expense-to-project association.

## Complete Purchase entity schema

The Purchase entity extends the Transaction base class and requires three elements for creation: `PaymentType`, `AccountRef`, and at least one `Line` item. The full field inventory spans core transaction fields, payment-specific properties, and inherited entity attributes.

### Required fields for create operations

| Field | Type | Description |
|-------|------|-------------|
| **PaymentType** | Enum | Values: `Cash`, `Check`, `CreditCard` |
| **AccountRef** | ReferenceType | Bank or Credit Card account (must match PaymentType) |
| **Line** | Array | Minimum one line with DetailType and associated detail object |

### Complete writable field reference

**Core Purchase Fields:**
```json
{
  "PaymentType": "CreditCard",
  "AccountRef": { "value": "42", "name": "Visa" },
  "EntityRef": { "value": "23", "name": "Vendor Name", "type": "Vendor" },
  "PaymentMethodRef": { "value": "1", "name": "Cash" },
  "PaymentRefNum": "1234",
  "Credit": false,
  "RemitToAddr": { "Line1": "123 Main St", "City": "Anytown", "PostalCode": "12345" },
  "Memo": "Payment memo visible to payee",
  "PrintStatus": "NeedToPrint",
  "GlobalTaxCalculation": "TaxExcluded",
  "CheckPayment": { },
  "CreditCardPayment": { }
}
```

**Transaction-level fields (inherited):**
```json
{
  "DocNumber": "EXP-001",
  "TxnDate": "2024-01-15",
  "DepartmentRef": { "value": "1", "name": "Main Office" },
  "CurrencyRef": { "value": "USD", "name": "United States Dollar" },
  "ExchangeRate": 1.0,
  "PrivateNote": "Internal note (max 4000 chars)",
  "TxnSource": "QBMobile",
  "LinkedTxn": [],
  "TxnTaxDetail": { },
  "Line": []
}
```

**Entity-level fields (inherited):**
```json
{
  "Id": "123",
  "SyncToken": "0",
  "sparse": true,
  "CustomField": [],
  "AttachableRef": []
}
```

**Read-only fields** (calculated by QuickBooks): `TotalAmt`, `Id`, `MetaData` (CreateTime, LastUpdatedTime), `domain`.

## Custom field handling: Critical limitations discovered

**The Purchase entity has limited or no custom field support via the traditional REST API.** This is a significant constraint for construction management apps needing project tracking fields like "Project/Wo#".

### CustomField JSON structure (when supported)

```json
{
  "CustomField": [
    {
      "DefinitionId": "1",
      "Name": "Project/Wo#",
      "Type": "StringType",
      "StringValue": "PRJ-12345"
    }
  ]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `DefinitionId` | String | **Required** | Unique identifier for the custom field definition |
| `Name` | String | Optional | Display name |
| `Type` | String | Required | `StringType`, `NumberType`, or `DateType` |
| `StringValue` | String | Conditional | Value when Type is StringType |

### Entity support matrix for custom fields

| Entity | Custom Fields Support |
|--------|----------------------|
| Invoice | ✅ Full Support |
| Estimate | ✅ Full Support |
| Sales Receipt | ✅ Full Support |
| Purchase Order | ✅ Full Support |
| **Purchase/Expense** | ⚠️ **Limited/Not Supported** |
| Bill | ⚠️ Limited |

### Traditional API limitations

The traditional REST API only supports the **first 3 string-type custom fields**, and these must be explicitly enabled in QBO company settings. For Purchase entities specifically, custom field data may not be returned or saved via API calls—a known platform limitation.

## Finding DefinitionId for existing custom fields

Three methods exist for discovering custom field DefinitionIds in a QBO company.

### Method 1: Query Preferences API

```
GET https://quickbooks.api.intuit.com/v3/company/{realmId}/query?query=select * from Preferences
```

The response contains `SalesFormsPrefs.CustomField`:
```json
{
  "SalesFormsPrefs": {
    "CustomField": [
      {
        "DefinitionId": "1",
        "Name": "Project/Wo#",
        "Type": "StringType"
      }
    ]
  }
}
```

### Method 2: Query existing transaction

Retrieve an Invoice or Sales Receipt with populated custom fields to extract DefinitionIds:
```
GET https://quickbooks.api.intuit.com/v3/company/{realmId}/invoice/{invoiceId}
```

### Method 3: GraphQL Custom Fields API (Premium partners only)

```graphql
query {
  appFoundationsCustomFieldDefinitions {
    id
    name
    type
    legacyIdV2
  }
}
```

The `legacyIdV2` from GraphQL maps to `DefinitionId` in REST API. Requires OAuth scope `app-foundations.custom-field-definitions.read`.

**Known issue**: DefinitionId can return `null` from Preferences in some cases—always verify by querying an existing transaction with populated values.

## Line item detail types: Complete field specifications

### AccountBasedExpenseLineDetail

Use for direct expense categorization without inventory tracking.

```json
{
  "Id": "1",
  "LineNum": 1,
  "Amount": 150.00,
  "Description": "Office supplies (max 4000 chars)",
  "DetailType": "AccountBasedExpenseLineDetail",
  "AccountBasedExpenseLineDetail": {
    "AccountRef": { "value": "64", "name": "Office Supplies" },
    "TaxCodeRef": { "value": "NON" },
    "TaxAmount": 0,
    "TaxInclusiveAmt": 150.00,
    "BillableStatus": "Billable",
    "CustomerRef": { "value": "12", "name": "ABC Company" },
    "ClassRef": { "value": "100", "name": "Marketing" },
    "MarkupInfo": { "PercentBased": true, "Percent": 10 }
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| AccountRef | **Required** | Must be Expense, COGS, or Other Current Asset account type |
| TaxCodeRef | Optional | Use `"NON"` for non-taxable, `"TAX"` for taxable |
| BillableStatus | Optional | `Billable`, `NotBillable`, `HasBeenBilled` |
| CustomerRef | **Required if BillableStatus = Billable** | Customer to bill |
| ClassRef | Optional | Requires class tracking enabled |

### ItemBasedExpenseLineDetail

Use for purchasing specific inventory items or tracked services.

```json
{
  "Id": "2",
  "LineNum": 2,
  "Amount": 125.00,
  "Description": "Garden supplies for inventory",
  "DetailType": "ItemBasedExpenseLineDetail",
  "ItemBasedExpenseLineDetail": {
    "ItemRef": { "value": "38", "name": "Garden Supplies" },
    "Qty": 5,
    "UnitPrice": 25.00,
    "TaxCodeRef": { "value": "TAX" },
    "BillableStatus": "Billable",
    "CustomerRef": { "value": "3", "name": "Cool Cars" },
    "ClassRef": { "value": "200", "name": "Hardware" },
    "PriceLevelRef": { "value": "1" },
    "ItemAccountRef": { "value": "52" },
    "InventorySiteRef": { "value": "1" }
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| ItemRef | **Required** | Without ItemRef, line is treated as documentation only |
| Qty | Optional | Default: 1 |
| UnitPrice | Optional | Uses item's default purchase cost if omitted |
| CustomerRef | **Required if BillableStatus = Billable** | |

**Critical validation**: Lines without `ItemRef` in ItemBasedExpenseLineDetail are ignored—Amount is not processed.

## Reference field structures and requirements

### ReferenceType standard structure

All reference fields follow this pattern:
```json
{
  "value": "123",
  "name": "Display Name",
  "type": "Vendor"
}
```
- `value`: **Required** - Entity ID
- `name`: Optional - For readability
- `type`: Optional - Only needed for EntityRef polymorphism

### Header-level reference fields

| Field | Required | Account Type Constraint |
|-------|----------|------------------------|
| **AccountRef** | **Required** | PaymentType=Cash/Check → Bank account; PaymentType=CreditCard → Credit Card account |
| **EntityRef** | Optional | Can reference Vendor, Customer, or Employee (specify `type`) |
| **DepartmentRef** | Optional | Requires location tracking enabled |
| **CurrencyRef** | Optional | Required for multi-currency companies |
| **PaymentMethodRef** | Optional | Payment method reference |

### Line-level reference fields

| Field | Location | Requirement |
|-------|----------|-------------|
| **AccountRef** | AccountBasedExpenseLineDetail | **Required** - Expense account |
| **ItemRef** | ItemBasedExpenseLineDetail | **Required** - Item being purchased |
| **TaxCodeRef** | Both DetailTypes | Optional |
| **CustomerRef** | Both DetailTypes | **Required when BillableStatus = Billable** |
| **ClassRef** | Both DetailTypes | Optional - Requires class tracking |

## Field-level validation rules

### PaymentType and AccountRef relationship

| PaymentType | AccountRef Constraint |
|-------------|----------------------|
| `Cash` | Must be Bank account type |
| `Check` | Must be Bank account type |
| `CreditCard` | Must be Credit Card account type |

### BillableStatus values and constraints

| Value | Description | API Writable |
|-------|-------------|--------------|
| `Billable` | Can be billed to customer | ✅ Yes |
| `NotBillable` | Will not be billed | ✅ Yes |
| `HasBeenBilled` | Already invoiced | ❌ System-managed only |

### Update operation requirements

**Full update**: Must include ALL writable fields; omitted fields are nullified. **Sparse update**: Set `sparse: true` and include only fields to change.

```json
{
  "sparse": true,
  "Id": "123",
  "SyncToken": "0",
  "PrivateNote": "Updated note only"
}
```

**Critical constraint**: Even in sparse updates, the **Line array must contain ALL line items**—partial line updates are not supported.

### Field length limits

- `DocNumber`: Max 21 characters
- `PrivateNote`: Max 4000 characters
- `Description` (line level): Max 4000 characters

## Maximum field usage example payload

```json
{
  "PaymentType": "CreditCard",
  "AccountRef": { "value": "42", "name": "Visa Credit Card" },
  "EntityRef": { "value": "50", "name": "Tech Supplies Inc", "type": "Vendor" },
  "Credit": false,
  "TxnDate": "2024-01-25",
  "DocNumber": "CC-2024-001",
  "PrivateNote": "Q1 technology equipment purchase - internal tracking",
  "Memo": "Equipment for Project Alpha",
  "GlobalTaxCalculation": "TaxExcluded",
  "DepartmentRef": { "value": "2", "name": "IT Department" },
  "CurrencyRef": { "value": "USD", "name": "United States Dollar" },
  "ExchangeRate": 1,
  "PrintStatus": "NotSet",
  "PaymentMethodRef": { "value": "2", "name": "Visa" },
  "Line": [
    {
      "Id": "1",
      "LineNum": 1,
      "Amount": 500.00,
      "Description": "Computer monitors for office upgrade",
      "DetailType": "ItemBasedExpenseLineDetail",
      "ItemBasedExpenseLineDetail": {
        "ItemRef": { "value": "100", "name": "Computer Equipment" },
        "Qty": 2,
        "UnitPrice": 250.00,
        "TaxCodeRef": { "value": "TAX" },
        "BillableStatus": "Billable",
        "CustomerRef": { "value": "15", "name": "Enterprise Client" },
        "ClassRef": { "value": "200", "name": "Hardware" }
      }
    },
    {
      "Id": "2",
      "LineNum": 2,
      "Amount": 100.00,
      "Description": "Travel expenses - meals",
      "DetailType": "AccountBasedExpenseLineDetail",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": { "value": "13", "name": "Meals and Entertainment" },
        "TaxCodeRef": { "value": "NON" },
        "BillableStatus": "NotBillable",
        "ClassRef": { "value": "300", "name": "Travel" }
      }
    }
  ]
}
```

## Recommended workarounds for project tracking on expenses

Since custom fields have limited Purchase entity support, consider these alternatives for your construction management app:

1. **CustomerRef for project association**: Create Customers or sub-customers representing projects, then assign expenses via line-level `CustomerRef`:
   ```json
   "CustomerRef": { "value": "project_123", "name": "Project Alpha - Phase 1" }
   ```

2. **ClassRef for project categorization**: Use Classes for project tracking (requires class tracking enabled in QBO settings)

3. **Memo field for freeform reference**: Always available on Purchase entity—use for "Project/Wo#" values when structured tracking isn't required

4. **DepartmentRef for location-based projects**: If projects map to physical locations

5. **Purchase Orders instead of direct expenses**: PurchaseOrder entity has full custom field support—create POs with custom fields, then convert to expenses

## Conclusion

The QuickBooks Online Purchase entity provides comprehensive expense tracking with **AccountBasedExpenseLineDetail** and **ItemBasedExpenseLineDetail** line types, robust reference field support, and flexible payment type handling. However, **custom field support is notably absent or severely limited** for the Purchase entity specifically—unlike Invoices and Purchase Orders which have full CustomField array support. For construction management applications requiring project/work order tracking on expenses, the most reliable approaches are using CustomerRef with project-based customer records, ClassRef for categorization, or the Memo field for freeform reference. If structured custom field data on expenses is mandatory, consider using the Bill entity or upgrading to Gold/Platinum partner tier for access to the premium Custom Fields GraphQL API.