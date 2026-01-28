# Contract Generation - Cursor Implementation Prompts

Use these prompts in sequence with Cursor AI to implement the contract generation feature. Reference `contract-generation-spec.md` for full details.

---

## Prompt 1: Database Migrations

```
Create database migrations for contract generation feature. Reference the full spec in docs/contract-generation-spec.md Part 1.

Create 3 migration files in supabase/migrations/:

1. `20260128001_add_contract_fields_to_payees.sql`:
   - Add contact_name TEXT
   - Add contact_title TEXT  
   - Add legal_form TEXT
   - Add state_of_formation TEXT
   - Add comments

2. `20260128002_create_contracts_table.sql`:
   - id UUID PK
   - project_id UUID FK NOT NULL
   - estimate_id UUID FK NULL
   - quote_id UUID FK NULL
   - payee_id UUID FK NOT NULL
   - contract_number TEXT NOT NULL UNIQUE per project
   - contract_type TEXT DEFAULT 'subcontractor_agreement'
   - subcontract_price DECIMAL(12,2) NOT NULL
   - agreement_date DATE NOT NULL
   - project_start_date DATE
   - project_end_date DATE
   - field_values JSONB NOT NULL (stores all field data at generation time)
   - docx_storage_path TEXT
   - pdf_storage_path TEXT
   - docx_url TEXT
   - pdf_url TEXT
   - status TEXT CHECK IN ('draft','generated','sent','signed','void','superseded')
   - version INTEGER DEFAULT 1
   - notes TEXT
   - created_at, created_by, updated_at
   - RLS policies for select/insert/update
   - Indexes on project_id, payee_id, status, created_at

3. `20260128003_create_company_settings_table.sql`:
   - Create company_settings table (setting_key UNIQUE, setting_value, setting_type, description)
   - Insert RCG defaults:
     - company_legal_name: "RCG LLC, a Kentucky limited liability company"
     - company_display_name: "Radcliff Construction Group, LLC"
     - company_address: "23 Erlanger Road, Erlanger, KY 41017"
     - company_phone: "(859) 802-0746"
     - company_email: "matt@radcliffcg.com"
     - company_website: "teamradcliff.com"
     - signatory_name: "Matt Radcliff"
     - signatory_title: "President/Owner"
   - RLS: all can read, only admin/executive can update

Follow existing migration patterns in the project.
```

---

## Prompt 2: TypeScript Types

```
Create TypeScript types for contract generation. Reference contract-generation-spec.md Parts 2.1 and 2.2.

Create src/types/contract.ts with:

1. LegalFormType: 'LLC' | 'Corp' | 'Inc' | 'Sole Proprietor' | 'Partnership' | 'LLP' | 'S-Corp' | 'Other'

2. USState: All 50 states + DC as type union

3. ContractStatus: 'draft' | 'generated' | 'sent' | 'signed' | 'void' | 'superseded'

4. SubcontractorInfo interface:
   - company, legalForm, stateOfFormation
   - contactName, contactTitle, phone, email
   - address, addressFormatted

5. ProjectInfo interface:
   - projectNameNumber (combined format: "[225-005] Project Name - Client")
   - projectNumber, projectName
   - location, propertyOwner
   - startDate, endDate (formatted strings)

6. ContractDetails interface:
   - subcontractNumber, subcontractPrice, subcontractPriceFormatted
   - agreementDate (full: "11th day of June, 2025"), agreementDateShort (ISO)
   - primeContractOwner

7. RCGInfo interface:
   - legalName, displayName, address
   - phone, email, website
   - signatoryName, signatoryTitle

8. ContractFieldValues: { subcontractor, project, contract, rcg }

9. ContractGenerationRequest/Response interfaces

10. Contract interface (database record)

11. ContractFieldValidation interface

Create src/constants/contractFields.ts with:
- CONTRACT_TEMPLATE_PLACEHOLDERS mapping
- REQUIRED_CONTRACT_FIELDS array
- LEGAL_FORM_OPTIONS array
- US_STATE_OPTIONS array

Follow existing type patterns in src/types/.
```

---

## Prompt 3: Utility Functions

```
Create utility functions for contract generation. Reference contract-generation-spec.md Part 3.

Create src/utils/contractFormatters.ts:
- getOrdinalSuffix(n): returns 'st', 'nd', 'rd', 'th'
- formatAgreementDate(date): "11th day of June, 2025"
- formatProjectDate(date): "M/D/YYYY"
- formatCurrency(amount): "$63,323.00"
- formatProjectNameNumber(number, name, client): "[225-005] Name - Client"
- formatLegalForm(state, form): "[KY] [LLC]"
- generateContractNumber(projectNumber, clientName, existingNumbers): unique number

Create src/utils/contractValidation.ts:
- getNestedValue(obj, path): gets value using dot notation
- isValidEmail(email): boolean
- isValidPhone(phone): boolean (loose validation)
- validateContractFields(fieldValues): returns { isValid, errors, warnings }
  - Check REQUIRED_CONTRACT_FIELDS
  - Validate email format
  - Validate phone format (warning only)
  - Validate price > 0
  - Validate dates are valid
  - Warn if endDate < startDate

Create src/hooks/useContractData.ts:
- Hook that fetches and assembles ContractFieldValues
- Params: { projectId, estimateId?, quoteId?, payeeId }
- Fetches in parallel: project+client, payee, estimate, quote, company_settings, existing contract numbers
- Builds SubcontractorInfo from payee
- Builds ProjectInfo from project
- Builds ContractDetails with auto-generated contract number
- Builds RCGInfo from company_settings
- Returns { fieldValues, isLoading, error, refetch }

Follow existing patterns in src/utils/ and src/hooks/.
```

---

## Prompt 4: Contract Generation Modal

```
Create the ContractGenerationModal component. Reference contract-generation-spec.md Part 4.1.

Create src/components/contracts/ContractGenerationModal.tsx:

Props: { open, onOpenChange, projectId, estimateId?, quoteId?, payeeId, onSuccess? }

Features:
1. Use useContractData hook to fetch initial data
2. react-hook-form with zod validation
3. Pre-fill all fields from fetched data
4. Allow user to edit any field before generation

UI Structure (use shadcn-ui):
- Dialog with max-w-2xl, scrollable
- Accordion with 4 sections (default open: subcontractor, project, contract)

Section 1: Subcontractor Information
- Company Name* (Input)
- Contact Name* (Input)
- Contact Title (Input)
- Phone (Input)
- Email (Input)
- Address* (Input)
- State of Formation* (Select - US_STATE_OPTIONS)
- Legal Form* (Select - LEGAL_FORM_OPTIONS)

Section 2: Project Information
- Project Name/Number* (Input)
- Location* (Input)
- Property Owner* (Input)
- Start Date* (Calendar popover)
- End Date* (Calendar popover)

Section 3: Contract Details
- Subcontract Number* (Input)
- Subcontract Price* (Number input)
- Agreement Date* (Calendar popover)
- Prime Contract Owner* (Input)

Section 4: RCG Information (collapsed by default)
- Read-only display of RCG settings
- Note: "To change, go to Settings"

Output Options:
- RadioGroup: DOCX only / PDF only / Both
- Checkbox: Save to Project Documents

Footer:
- Cancel button
- Generate Contract button (shows loading state)

On Submit:
1. Build ContractFieldValues from form
2. Validate with validateContractFields
3. Call supabase.functions.invoke('generate-contract', { body: request })
4. Show toast on success/error
5. Call onSuccess callback
6. Close modal

Loading State: Show centered spinner
Error State: Show error message with close button

Follow patterns from QuickWorkOrderForm and ChangeOrderModal.
```

---

## Prompt 5: Edge Function

```
Create the generate-contract Supabase edge function. Reference contract-generation-spec.md Part 5.1.

Create supabase/functions/generate-contract/index.ts:

1. CORS handling (same as other functions)

2. Request body: { projectId, estimateId?, quoteId?, payeeId, fieldValues, outputFormat, saveToDocuments }

3. PLACEHOLDERS constant mapping {{PLACEHOLDER}} to fieldValues paths

4. Helper functions:
   - getNestedValue(obj, path): get value from nested object
   - escapeXml(str): escape &, <, >, ", '
   - replacePlaceholders(xml, fieldValues): replace all {{PLACEHOLDERS}}

5. Main flow:
   a. Download template from storage bucket 'contract-templates'
   b. Use JSZip to unzip template
   c. Get word/document.xml content
   d. Replace placeholders in document.xml
   e. Also process word/header*.xml and word/footer*.xml files
   f. Rezip to buffer
   g. Upload to storage 'project-documents/contracts/{projectId}/{contractNumber}_Agreement_{date}.docx'
   h. Get public URL
   i. Insert into contracts table with all field_values as JSONB
   j. Optionally insert into project_documents table
   k. Return { success, contractId, contractNumber, docxUrl, pdfUrl }

6. Error handling: catch and return { success: false, error: message }

Note: Skip PDF generation for MVP (would require LibreOffice)

Follow patterns from generate-media-report edge function.
```

---

## Prompt 6: Integration

```
Integrate contract generation into existing views.

1. Add "Generate Contract" button to accepted quotes:

In src/components/quotes/QuoteDetailView.tsx (or wherever quote details are shown):
- Add state: const [showContractModal, setShowContractModal] = useState(false)
- Add button when quote.status === 'accepted':
  <Button onClick={() => setShowContractModal(true)}>
    <FileText className="mr-2 h-4 w-4" />
    Generate Contract
  </Button>
- Add modal:
  <ContractGenerationModal
    open={showContractModal}
    onOpenChange={setShowContractModal}
    projectId={quote.project_id}
    quoteId={quote.id}
    payeeId={quote.payee_id}
    onSuccess={(result) => {
      toast({ title: 'Contract Generated', description: `Download: ${result.docxUrl}` })
    }}
  />

2. Add Contracts to Project Detail navigation:

In src/components/ProjectDetailView.tsx, add to CONTRACTS & ESTIMATES group:
{ title: "Contracts", url: "contracts", icon: FileSignature }

3. Create ContractsListView component:

Create src/components/contracts/ContractsListView.tsx:
- Fetch contracts for project from contracts table
- Display as table with: contract_number, subcontract_price, agreement_date, payee name, status, actions
- Actions: Download DOCX, Download PDF (if available), View Details
- Empty state: "No contracts generated yet"

Follow existing list view patterns like ExpensesListView.
```

---

## Template Preparation Checklist

Before testing, you need to prepare the contract template:

1. Open original contract template in Word
2. Find and replace all values with placeholders (see spec Part 6.1 for full list)
3. Save as `subcontractor-agreement-template.docx`
4. Create Supabase storage bucket `contract-templates` (public read)
5. Upload template to bucket
6. Test that edge function can download template

Key placeholders to replace:
- {{SUBCONTRACTOR_COMPANY}} - company name
- {{SUBCONTRACTOR_CONTACT}} - contact person
- {{SUBCONTRACTOR_PHONE}}, {{SUBCONTRACTOR_EMAIL}}
- {{SUBCONTRACTOR_ADDRESS}}
- {{SUBCONTRACTOR_STATE}}, {{SUBCONTRACTOR_LEGAL_FORM}}
- {{PROJECT_NAME_NUMBER}}, {{PROJECT_LOCATION}}
- {{PROPERTY_OWNER}}
- {{PROJECT_START_DATE}}, {{PROJECT_END_DATE}}
- {{SUBCONTRACT_NUMBER}}, {{SUBCONTRACT_PRICE}}
- {{AGREEMENT_DATE}}
- {{PRIME_CONTRACT_OWNER}}
- {{RCG_LEGAL_NAME}}, {{RCG_DISPLAY_NAME}}, {{RCG_ADDRESS}}
- {{RCG_SIGNATORY_NAME}}, {{RCG_SIGNATORY_TITLE}}
