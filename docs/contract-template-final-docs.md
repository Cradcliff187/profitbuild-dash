# Contract Template - Final Documentation

## Template File
**Filename:** `subcontractor-agreement-template-FINAL.docx`
**Upload to:** Supabase Storage bucket `contract-templates`

---

## Complete Placeholder Mapping (25 placeholders)

### Subcontractor Information (11 placeholders)

| Placeholder | Description | Occurrences | Example Value |
|-------------|-------------|-------------|---------------|
| `{{SUBCONTRACTOR_COMPANY}}` | Company name | 3 | "Markco Plumbing" |
| `{{SUBCONTRACTOR_CONTACT}}` | Contact person name | 2 | "Mark Wilmink" |
| `{{SUBCONTRACTOR_TITLE}}` | Contact title (signature block) | 1 | "President" |
| `{{SUBCONTRACTOR_PHONE}}` | Phone number | 1 | "(859) 371-6217" |
| `{{SUBCONTRACTOR_EMAIL}}` | Email address | 1 | "mwilmink@markcoinc.com" |
| `{{SUBCONTRACTOR_STREET_ADDRESS}}` | Street address | 3 | "PO Box 1276" |
| `{{SUBCONTRACTOR_CITY_STATE_ZIP}}` | City, State ZIP | 3 | "Florence, KY 41042" |
| `{{SUBCONTRACTOR_ADDRESS}}` | Full address (body text) | 1 | "PO Box 1276, Florence, KY 41042" |
| `{{SUBCONTRACTOR_LEGAL_ENTITY}}` | Legal form with state | 1 | "[KY] [LLC]" |

### Project Information (6 placeholders)

| Placeholder | Description | Occurrences | Example Value |
|-------------|-------------|-------------|---------------|
| `{{PROJECT_NAME_NUMBER}}` | Project identifier | 2 | "[225-005] UC Neuro Suite 301 - UC Health" |
| `{{PROJECT_LOCATION}}` | Project address | 2 | "7675 Wellness Way, Suite 301, West Chester, OH 45069" |
| `{{PROJECT_START_DATE}}` | Start date | 1 | "12/1/2025" |
| `{{PROJECT_END_DATE}}` | End date | 1 | "3/1/2025" |
| `{{PROPERTY_OWNER}}` | Property owner/client | 1 | "UC Health" |
| `{{PRIME_CONTRACT_OWNER}}` | Prime contract owner | 1 | "UC Health" |

### Contract Details (3 placeholders)

| Placeholder | Description | Occurrences | Example Value |
|-------------|-------------|-------------|---------------|
| `{{SUBCONTRACT_NUMBER}}` | Contract number | 1 | "UCH188560" |
| `{{SUBCONTRACT_PRICE}}` | Dollar amount formatted | 1 | "$63,323.00" |
| `{{AGREEMENT_DATE}}` | Full date format | 1 | "11th day of June, 2025" |

### RCG Company Information (7 placeholders)

| Placeholder | Description | Occurrences | Example Value |
|-------------|-------------|-------------|---------------|
| `{{RCG_DISPLAY_NAME}}` | Company display name | 1 | "Radcliff Construction Group, LLC" |
| `{{RCG_LEGAL_NAME}}` | Full legal name | 1 | "RCG LLC, a Kentucky limited liability company" |
| `{{RCG_ADDRESS}}` | Full address (body text) | 1 | "23 Erlanger Road, Erlanger, KY 41017" |
| `{{RCG_STREET_ADDRESS}}` | Street address | 1 | "23 Erlanger Rd." |
| `{{RCG_CITY_STATE_ZIP}}` | City, State ZIP | 1 | "Erlanger, KY 41017" |
| `{{RCG_SIGNATORY_NAME}}` | Signatory name | 1 | "Matt Radcliff" |
| `{{RCG_SIGNATORY_TITLE}}` | Signatory title | 1 | "President/Owner" |

---

## Edge Function Placeholder Mapping

```typescript
const PLACEHOLDERS: Record<string, string> = {
  // Subcontractor
  '{{SUBCONTRACTOR_COMPANY}}': 'subcontractor.company',
  '{{SUBCONTRACTOR_CONTACT}}': 'subcontractor.contactName',
  '{{SUBCONTRACTOR_TITLE}}': 'subcontractor.contactTitle',
  '{{SUBCONTRACTOR_PHONE}}': 'subcontractor.phone',
  '{{SUBCONTRACTOR_EMAIL}}': 'subcontractor.email',
  '{{SUBCONTRACTOR_STREET_ADDRESS}}': 'subcontractor.streetAddress',
  '{{SUBCONTRACTOR_CITY_STATE_ZIP}}': 'subcontractor.cityStateZip',
  '{{SUBCONTRACTOR_ADDRESS}}': 'subcontractor.fullAddress',
  '{{SUBCONTRACTOR_LEGAL_ENTITY}}': 'subcontractor.legalEntity',
  
  // Project
  '{{PROJECT_NAME_NUMBER}}': 'project.projectNameNumber',
  '{{PROJECT_LOCATION}}': 'project.location',
  '{{PROJECT_START_DATE}}': 'project.startDate',
  '{{PROJECT_END_DATE}}': 'project.endDate',
  '{{PROPERTY_OWNER}}': 'project.propertyOwner',
  '{{PRIME_CONTRACT_OWNER}}': 'contract.primeContractOwner',
  
  // Contract
  '{{SUBCONTRACT_NUMBER}}': 'contract.subcontractNumber',
  '{{SUBCONTRACT_PRICE}}': 'contract.subcontractPriceFormatted',
  '{{AGREEMENT_DATE}}': 'contract.agreementDate',
  
  // RCG
  '{{RCG_DISPLAY_NAME}}': 'rcg.displayName',
  '{{RCG_LEGAL_NAME}}': 'rcg.legalName',
  '{{RCG_ADDRESS}}': 'rcg.fullAddress',
  '{{RCG_STREET_ADDRESS}}': 'rcg.streetAddress',
  '{{RCG_CITY_STATE_ZIP}}': 'rcg.cityStateZip',
  '{{RCG_SIGNATORY_NAME}}': 'rcg.signatoryName',
  '{{RCG_SIGNATORY_TITLE}}': 'rcg.signatoryTitle',
};
```

---

## TypeScript Interfaces

```typescript
export interface SubcontractorInfo {
  company: string;
  contactName: string;
  contactTitle: string;
  phone: string;
  email: string;
  streetAddress: string;
  cityStateZip: string;
  fullAddress: string;
  legalEntity: string;  // Format: "[KY] [LLC]"
}

export interface ProjectInfo {
  projectNameNumber: string;  // "[225-005] Project Name - Client"
  projectNumber: string;
  projectName: string;
  location: string;
  propertyOwner: string;
  startDate: string;  // "MM/DD/YYYY"
  endDate: string;    // "MM/DD/YYYY"
}

export interface ContractDetails {
  subcontractNumber: string;
  subcontractPrice: number;
  subcontractPriceFormatted: string;  // "$63,323.00"
  agreementDate: string;              // "11th day of June, 2025"
  agreementDateShort: string;         // "2025-06-11"
  primeContractOwner: string;
}

export interface RCGInfo {
  displayName: string;
  legalName: string;
  fullAddress: string;
  streetAddress: string;
  cityStateZip: string;
  signatoryName: string;
  signatoryTitle: string;
}

export interface ContractFieldValues {
  subcontractor: SubcontractorInfo;
  project: ProjectInfo;
  contract: ContractDetails;
  rcg: RCGInfo;
}
```

---

# Cursor Prompt: Template Storage Setup

```
Upload the contract template to Supabase storage.

## Task
1. Create a Supabase storage bucket called `contract-templates` if it doesn't exist
2. The bucket should be:
   - Private (not public)
   - Accessible by authenticated users
   - Accessible by service role (for edge functions)

3. Upload the template file `subcontractor-agreement-template-FINAL.docx` to the bucket root

## Storage bucket SQL (run in Supabase SQL editor if needed):
```sql
-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-templates', 'contract-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Service role can read (for edge functions)
CREATE POLICY "Service role can read contract templates"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'contract-templates');

-- Policy: Admins can upload/manage templates  
CREATE POLICY "Admins can manage contract templates"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'contract-templates' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'executive')
  )
);
```

## After upload, verify:
- File is accessible at path: `contract-templates/subcontractor-agreement-template-FINAL.docx`
- Edge function can download it using service role key
```
