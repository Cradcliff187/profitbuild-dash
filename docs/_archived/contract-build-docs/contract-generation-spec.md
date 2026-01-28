# Contract Generation Implementation Spec

## Overview

This spec defines the implementation of a contract generation feature for RCG Work that allows users to generate subcontractor agreements from a Word template with a preview/edit UI before final generation.

**Key Principles:**
- Template-based XML replacement preserves exact formatting, headers, footers, logos
- All fields are reviewable and editable before generation
- Generated contracts are stored with field snapshots for audit trail
- Supports both DOCX and PDF output

---

## Part 1: Database Schema

### 1.1 Migration: Add fields to `payees` table

```sql
-- Migration: 20260128_add_contract_fields_to_payees.sql

-- Add contact and legal fields to payees for contract generation
ALTER TABLE payees ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE payees ADD COLUMN IF NOT EXISTS contact_title TEXT;
ALTER TABLE payees ADD COLUMN IF NOT EXISTS legal_form TEXT; -- e.g., "KY LLC", "OH Corp", "IN Sole Proprietor"
ALTER TABLE payees ADD COLUMN IF NOT EXISTS state_of_formation TEXT; -- e.g., "KY", "OH", "IN"

-- Add comments for documentation
COMMENT ON COLUMN payees.contact_name IS 'Primary contact person name for contracts';
COMMENT ON COLUMN payees.contact_title IS 'Contact person title (e.g., President, Owner, Manager)';
COMMENT ON COLUMN payees.legal_form IS 'Legal entity type (e.g., LLC, Corp, Sole Proprietor)';
COMMENT ON COLUMN payees.state_of_formation IS 'State where entity was formed (e.g., KY, OH)';
```

### 1.2 Migration: Create `contracts` table

```sql
-- Migration: 20260128_create_contracts_table.sql

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  payee_id UUID NOT NULL REFERENCES payees(id) ON DELETE RESTRICT,
  
  -- Contract identification
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'subcontractor_agreement',
  
  -- Financial
  subcontract_price DECIMAL(12,2) NOT NULL,
  
  -- Dates
  agreement_date DATE NOT NULL,
  project_start_date DATE,
  project_end_date DATE,
  
  -- All field values at generation time (audit trail)
  field_values JSONB NOT NULL,
  
  -- Generated documents
  docx_storage_path TEXT,
  pdf_storage_path TEXT,
  docx_url TEXT,
  pdf_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'signed', 'void', 'superseded')),
  
  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(project_id, contract_number)
);

-- Indexes for common queries
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_payee_id ON contracts(payee_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts" ON contracts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert contracts" ON contracts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update contracts" ON contracts
  FOR UPDATE USING (true);

-- Comments
COMMENT ON TABLE contracts IS 'Generated subcontractor agreements and other contracts';
COMMENT ON COLUMN contracts.field_values IS 'JSON snapshot of all field values used at generation time';
COMMENT ON COLUMN contracts.version IS 'Version number for tracking regenerations/amendments';
```

### 1.3 Migration: Create `company_settings` table (for RCG info)

```sql
-- Migration: 20260128_create_company_settings_table.sql

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'text' CHECK (setting_type IN ('text', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default RCG company information
INSERT INTO company_settings (setting_key, setting_value, description) VALUES
  ('company_legal_name', 'RCG LLC, a Kentucky limited liability company', 'Full legal name for contracts'),
  ('company_display_name', 'Radcliff Construction Group, LLC', 'Display name for signature blocks'),
  ('company_address', '23 Erlanger Road, Erlanger, KY 41017', 'Primary business address'),
  ('company_phone', '(859) 802-0746', 'Main phone number'),
  ('company_email', 'matt@radcliffcg.com', 'Main contact email'),
  ('company_website', 'teamradcliff.com', 'Company website'),
  ('signatory_name', 'Matt Radcliff', 'Default signatory name'),
  ('signatory_title', 'President/Owner', 'Default signatory title'),
  ('contract_number_prefix', '', 'Prefix for auto-generated contract numbers');

-- RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings" ON company_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update company settings" ON company_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'executive')
    )
  );

-- Trigger
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Part 2: TypeScript Interfaces

### 2.1 Contract Field Types

```typescript
// src/types/contract.ts

/**
 * Legal form options for subcontractors
 */
export type LegalFormType = 
  | 'LLC'
  | 'Corp'
  | 'Inc'
  | 'Sole Proprietor'
  | 'Partnership'
  | 'LLP'
  | 'S-Corp'
  | 'Other';

/**
 * US State abbreviations
 */
export type USState = 
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'DC';

/**
 * Contract status
 */
export type ContractStatus = 
  | 'draft'
  | 'generated'
  | 'sent'
  | 'signed'
  | 'void'
  | 'superseded';

/**
 * Subcontractor information for contract generation
 */
export interface SubcontractorInfo {
  // Company identification
  company: string;           // Display name (e.g., "Markco Plumbing")
  legalForm: LegalFormType;  // Entity type (e.g., "LLC")
  stateOfFormation: USState; // State (e.g., "KY")
  
  // Contact information
  contactName: string;       // Primary contact (e.g., "Mark Wilmink")
  contactTitle: string;      // Title (e.g., "President")
  phone: string;             // Phone number
  email: string;             // Email address
  
  // Address
  address: string;           // Full address for body text
  addressFormatted: string;  // Formatted for header box (may differ)
}

/**
 * Project information for contract generation
 */
export interface ProjectInfo {
  projectNameNumber: string; // Combined format: "[225-005] UC Neuro Suite 301 - UC Health"
  projectNumber: string;     // Just the number: "225-005"
  projectName: string;       // Just the name: "UC Neuro Suite 301 - UC Health"
  location: string;          // Full project address
  propertyOwner: string;     // Usually the client name
  startDate: string;         // Format: "MM/DD/YYYY"
  endDate: string;           // Format: "MM/DD/YYYY"
}

/**
 * Contract details for generation
 */
export interface ContractDetails {
  subcontractNumber: string;     // Unique identifier (e.g., "UCH188560")
  subcontractPrice: number;      // Dollar amount
  subcontractPriceFormatted: string; // Formatted: "$63,323.00"
  agreementDate: string;         // Full format: "11th day of June, 2025"
  agreementDateShort: string;    // Short format for internal use: "2025-06-11"
  primeContractOwner: string;    // Usually same as property owner
}

/**
 * RCG company information (from settings)
 */
export interface RCGInfo {
  legalName: string;        // "RCG LLC, a Kentucky limited liability company"
  displayName: string;      // "Radcliff Construction Group, LLC"
  address: string;          // "23 Erlanger Road, Erlanger, KY 41017"
  phone: string;            // "(859) 802-0746"
  email: string;            // "matt@radcliffcg.com"
  website: string;          // "teamradcliff.com"
  signatoryName: string;    // "Matt Radcliff"
  signatoryTitle: string;   // "President/Owner"
}

/**
 * Complete contract field values for generation
 */
export interface ContractFieldValues {
  subcontractor: SubcontractorInfo;
  project: ProjectInfo;
  contract: ContractDetails;
  rcg: RCGInfo;
}

/**
 * Contract generation request payload
 */
export interface ContractGenerationRequest {
  projectId: string;
  estimateId?: string;
  quoteId?: string;
  payeeId: string;
  fieldValues: ContractFieldValues;
  outputFormat: 'docx' | 'pdf' | 'both';
  saveToDocuments: boolean;
}

/**
 * Contract generation response
 */
export interface ContractGenerationResponse {
  success: boolean;
  contractId: string;
  contractNumber: string;
  docxUrl?: string;
  pdfUrl?: string;
  error?: string;
}

/**
 * Contract record from database
 */
export interface Contract {
  id: string;
  project_id: string;
  estimate_id: string | null;
  quote_id: string | null;
  payee_id: string;
  contract_number: string;
  contract_type: string;
  subcontract_price: number;
  agreement_date: string;
  project_start_date: string | null;
  project_end_date: string | null;
  field_values: ContractFieldValues;
  docx_storage_path: string | null;
  pdf_storage_path: string | null;
  docx_url: string | null;
  pdf_url: string | null;
  status: ContractStatus;
  version: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Validation result for contract fields
 */
export interface ContractFieldValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}
```

### 2.2 Field Mapping Constants

```typescript
// src/constants/contractFields.ts

/**
 * Mapping of template placeholders to field paths
 * Used by edge function for XML replacement
 */
export const CONTRACT_TEMPLATE_PLACEHOLDERS = {
  // Subcontractor fields
  '{{SUBCONTRACTOR_COMPANY}}': 'subcontractor.company',
  '{{SUBCONTRACTOR_CONTACT}}': 'subcontractor.contactName',
  '{{SUBCONTRACTOR_PHONE}}': 'subcontractor.phone',
  '{{SUBCONTRACTOR_EMAIL}}': 'subcontractor.email',
  '{{SUBCONTRACTOR_ADDRESS}}': 'subcontractor.address',
  '{{SUBCONTRACTOR_ADDRESS_FORMATTED}}': 'subcontractor.addressFormatted',
  '{{SUBCONTRACTOR_LEGAL_FORM}}': 'subcontractor.legalForm',
  '{{SUBCONTRACTOR_STATE}}': 'subcontractor.stateOfFormation',
  '{{SUBCONTRACTOR_TITLE}}': 'subcontractor.contactTitle',
  
  // Project fields
  '{{PROJECT_NAME_NUMBER}}': 'project.projectNameNumber',
  '{{PROJECT_NUMBER}}': 'project.projectNumber',
  '{{PROJECT_NAME}}': 'project.projectName',
  '{{PROJECT_LOCATION}}': 'project.location',
  '{{PROPERTY_OWNER}}': 'project.propertyOwner',
  '{{PROJECT_START_DATE}}': 'project.startDate',
  '{{PROJECT_END_DATE}}': 'project.endDate',
  
  // Contract fields
  '{{SUBCONTRACT_NUMBER}}': 'contract.subcontractNumber',
  '{{SUBCONTRACT_PRICE}}': 'contract.subcontractPriceFormatted',
  '{{AGREEMENT_DATE}}': 'contract.agreementDate',
  '{{PRIME_CONTRACT_OWNER}}': 'contract.primeContractOwner',
  
  // RCG fields
  '{{RCG_LEGAL_NAME}}': 'rcg.legalName',
  '{{RCG_DISPLAY_NAME}}': 'rcg.displayName',
  '{{RCG_ADDRESS}}': 'rcg.address',
  '{{RCG_PHONE}}': 'rcg.phone',
  '{{RCG_EMAIL}}': 'rcg.email',
  '{{RCG_WEBSITE}}': 'rcg.website',
  '{{RCG_SIGNATORY_NAME}}': 'rcg.signatoryName',
  '{{RCG_SIGNATORY_TITLE}}': 'rcg.signatoryTitle',
} as const;

/**
 * Required fields for contract generation
 */
export const REQUIRED_CONTRACT_FIELDS = [
  'subcontractor.company',
  'subcontractor.contactName',
  'subcontractor.address',
  'subcontractor.legalForm',
  'subcontractor.stateOfFormation',
  'project.projectNameNumber',
  'project.location',
  'project.propertyOwner',
  'project.startDate',
  'project.endDate',
  'contract.subcontractNumber',
  'contract.subcontractPrice',
  'contract.agreementDate',
] as const;

/**
 * Legal form options for dropdown
 */
export const LEGAL_FORM_OPTIONS = [
  { value: 'LLC', label: 'LLC (Limited Liability Company)' },
  { value: 'Corp', label: 'Corporation' },
  { value: 'Inc', label: 'Incorporated' },
  { value: 'S-Corp', label: 'S-Corporation' },
  { value: 'Sole Proprietor', label: 'Sole Proprietor' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'LLP', label: 'LLP (Limited Liability Partnership)' },
  { value: 'Other', label: 'Other' },
] as const;

/**
 * US State options for dropdown
 */
export const US_STATE_OPTIONS = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;
```

---

## Part 3: Utility Functions

### 3.1 Date Formatting

```typescript
// src/utils/contractFormatters.ts

import { format, parse } from 'date-fns';

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Format date as "11th day of June, 2025"
 */
export function formatAgreementDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const ordinal = getOrdinalSuffix(day);
  const month = format(d, 'MMMM');
  const year = format(d, 'yyyy');
  return `${day}${ordinal} day of ${month}, ${year}`;
}

/**
 * Format date as "MM/DD/YYYY"
 */
export function formatProjectDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'M/d/yyyy');
}

/**
 * Format currency as "$63,323.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format project name/number as "[225-005] UC Neuro Suite 301 - UC Health"
 */
export function formatProjectNameNumber(
  projectNumber: string | null,
  projectName: string | null,
  clientName?: string | null
): string {
  const parts: string[] = [];
  
  if (projectNumber) {
    parts.push(`[${projectNumber}]`);
  }
  
  if (projectName) {
    parts.push(projectName);
  }
  
  if (clientName && projectName && !projectName.includes(clientName)) {
    parts.push(`- ${clientName}`);
  }
  
  return parts.join(' ');
}

/**
 * Format legal form for contract body
 * e.g., "[KY] [LLC]" or "a Kentucky limited liability company"
 */
export function formatLegalForm(state: string, legalForm: string): string {
  return `[${state}] [${legalForm}]`;
}

/**
 * Generate contract number
 * Format: {ClientPrefix}{ProjectNumber} or custom
 */
export function generateContractNumber(
  projectNumber: string,
  clientName: string,
  existingNumbers: string[]
): string {
  // Extract initials from client name (e.g., "UC Health" -> "UCH")
  const initials = clientName
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 3);
  
  // Generate base number
  const baseNumber = `${initials}${projectNumber.replace(/-/g, '')}`;
  
  // Check for duplicates and add suffix if needed
  let candidate = baseNumber;
  let suffix = 0;
  while (existingNumbers.includes(candidate)) {
    suffix++;
    candidate = `${baseNumber}-${suffix}`;
  }
  
  return candidate;
}
```

### 3.2 Field Validation

```typescript
// src/utils/contractValidation.ts

import type { ContractFieldValues, ContractFieldValidation } from '@/types/contract';
import { REQUIRED_CONTRACT_FIELDS } from '@/constants/contractFields';

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone format (loose validation)
 */
function isValidPhone(phone: string): boolean {
  // Allow various formats: (859) 371-6217, 859-371-6217, 8593716217
  return /^[\d\s\-\(\)\.+]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Validate contract field values
 */
export function validateContractFields(
  fieldValues: ContractFieldValues
): ContractFieldValidation {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  // Check required fields
  for (const fieldPath of REQUIRED_CONTRACT_FIELDS) {
    const value = getNestedValue(fieldValues, fieldPath);
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors[fieldPath] = 'This field is required';
    }
  }
  
  // Validate email if provided
  if (fieldValues.subcontractor.email && !isValidEmail(fieldValues.subcontractor.email)) {
    errors['subcontractor.email'] = 'Invalid email format';
  }
  
  // Validate phone if provided
  if (fieldValues.subcontractor.phone && !isValidPhone(fieldValues.subcontractor.phone)) {
    warnings['subcontractor.phone'] = 'Phone format may be invalid';
  }
  
  // Validate price is positive
  if (fieldValues.contract.subcontractPrice <= 0) {
    errors['contract.subcontractPrice'] = 'Subcontract price must be greater than zero';
  }
  
  // Validate dates
  const startDate = new Date(fieldValues.project.startDate);
  const endDate = new Date(fieldValues.project.endDate);
  
  if (isNaN(startDate.getTime())) {
    errors['project.startDate'] = 'Invalid start date';
  }
  
  if (isNaN(endDate.getTime())) {
    errors['project.endDate'] = 'Invalid end date';
  }
  
  if (startDate > endDate) {
    warnings['project.endDate'] = 'End date is before start date';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
```

### 3.3 Data Fetching Hook

```typescript
// src/hooks/useContractData.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ContractFieldValues, RCGInfo } from '@/types/contract';
import {
  formatAgreementDate,
  formatProjectDate,
  formatCurrency,
  formatProjectNameNumber,
  generateContractNumber,
} from '@/utils/contractFormatters';

interface UseContractDataParams {
  projectId: string;
  estimateId?: string;
  quoteId?: string;
  payeeId: string;
}

interface UseContractDataResult {
  fieldValues: ContractFieldValues | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch and prepare contract field values from database
 */
export function useContractData({
  projectId,
  estimateId,
  quoteId,
  payeeId,
}: UseContractDataParams): UseContractDataResult {
  const [fieldValues, setFieldValues] = useState<ContractFieldValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        projectResult,
        payeeResult,
        estimateResult,
        quoteResult,
        settingsResult,
        existingContractsResult,
      ] = await Promise.all([
        // Project with client
        supabase
          .from('projects')
          .select(`
            *,
            clients (
              id,
              client_name,
              address,
              city,
              state,
              zip
            )
          `)
          .eq('id', projectId)
          .single(),
        
        // Payee (subcontractor)
        supabase
          .from('payees')
          .select('*')
          .eq('id', payeeId)
          .single(),
        
        // Estimate (optional)
        estimateId
          ? supabase
              .from('estimates')
              .select('*')
              .eq('id', estimateId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        
        // Quote (optional)
        quoteId
          ? supabase
              .from('quotes')
              .select('*')
              .eq('id', quoteId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        
        // Company settings
        supabase
          .from('company_settings')
          .select('setting_key, setting_value'),
        
        // Existing contract numbers for this project
        supabase
          .from('contracts')
          .select('contract_number')
          .eq('project_id', projectId),
      ]);

      // Check for errors
      if (projectResult.error) throw new Error(`Project: ${projectResult.error.message}`);
      if (payeeResult.error) throw new Error(`Payee: ${payeeResult.error.message}`);
      if (settingsResult.error) throw new Error(`Settings: ${settingsResult.error.message}`);

      const project = projectResult.data;
      const payee = payeeResult.data;
      const estimate = estimateResult.data;
      const quote = quoteResult.data;
      const settings = settingsResult.data || [];
      const existingNumbers = (existingContractsResult.data || []).map(c => c.contract_number);

      // Build settings map
      const settingsMap = new Map(settings.map(s => [s.setting_key, s.setting_value]));

      // Build RCG info from settings
      const rcg: RCGInfo = {
        legalName: settingsMap.get('company_legal_name') || 'RCG LLC, a Kentucky limited liability company',
        displayName: settingsMap.get('company_display_name') || 'Radcliff Construction Group, LLC',
        address: settingsMap.get('company_address') || '23 Erlanger Road, Erlanger, KY 41017',
        phone: settingsMap.get('company_phone') || '(859) 802-0746',
        email: settingsMap.get('company_email') || 'matt@radcliffcg.com',
        website: settingsMap.get('company_website') || 'teamradcliff.com',
        signatoryName: settingsMap.get('signatory_name') || 'Matt Radcliff',
        signatoryTitle: settingsMap.get('signatory_title') || 'President/Owner',
      };

      // Determine subcontract price
      const subcontractPrice = quote?.total_amount || estimate?.total_amount || 0;

      // Build client name
      const clientName = project.clients?.client_name || '';

      // Build field values
      const values: ContractFieldValues = {
        subcontractor: {
          company: payee.payee_name || '',
          legalForm: payee.legal_form || 'LLC',
          stateOfFormation: payee.state_of_formation || 'KY',
          contactName: payee.contact_name || '',
          contactTitle: payee.contact_title || '',
          phone: payee.phone || '',
          email: payee.email || '',
          address: payee.address || '',
          addressFormatted: payee.address || '',
        },
        project: {
          projectNameNumber: formatProjectNameNumber(
            project.project_number,
            project.project_name,
            clientName
          ),
          projectNumber: project.project_number || '',
          projectName: project.project_name || '',
          location: project.address || '',
          propertyOwner: clientName,
          startDate: project.start_date ? formatProjectDate(project.start_date) : '',
          endDate: project.end_date ? formatProjectDate(project.end_date) : '',
        },
        contract: {
          subcontractNumber: generateContractNumber(
            project.project_number || 'NEW',
            clientName,
            existingNumbers
          ),
          subcontractPrice,
          subcontractPriceFormatted: formatCurrency(subcontractPrice),
          agreementDate: formatAgreementDate(new Date()),
          agreementDateShort: new Date().toISOString().split('T')[0],
          primeContractOwner: clientName,
        },
        rcg,
      };

      setFieldValues(values);
    } catch (err) {
      console.error('Error fetching contract data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contract data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && payeeId) {
      fetchData();
    }
  }, [projectId, estimateId, quoteId, payeeId]);

  return {
    fieldValues,
    isLoading,
    error,
    refetch: fetchData,
  };
}
```

---

## Part 4: React Components

### 4.1 Contract Generation Modal

```typescript
// src/components/contracts/ContractGenerationModal.tsx

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar as CalendarIcon, AlertCircle, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { useContractData } from '@/hooks/useContractData';
import { validateContractFields } from '@/utils/contractValidation';
import { formatAgreementDate, formatProjectDate, formatCurrency } from '@/utils/contractFormatters';
import { LEGAL_FORM_OPTIONS, US_STATE_OPTIONS } from '@/constants/contractFields';
import type { ContractFieldValues, ContractGenerationResponse } from '@/types/contract';

// Form schema
const contractFormSchema = z.object({
  // Subcontractor
  subcontractorCompany: z.string().min(1, 'Company name is required'),
  subcontractorContactName: z.string().min(1, 'Contact name is required'),
  subcontractorContactTitle: z.string().optional(),
  subcontractorPhone: z.string().optional(),
  subcontractorEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  subcontractorAddress: z.string().min(1, 'Address is required'),
  subcontractorLegalForm: z.string().min(1, 'Legal form is required'),
  subcontractorState: z.string().min(1, 'State is required'),
  
  // Project
  projectNameNumber: z.string().min(1, 'Project name/number is required'),
  projectLocation: z.string().min(1, 'Location is required'),
  propertyOwner: z.string().min(1, 'Property owner is required'),
  projectStartDate: z.date({ required_error: 'Start date is required' }),
  projectEndDate: z.date({ required_error: 'End date is required' }),
  
  // Contract
  subcontractNumber: z.string().min(1, 'Subcontract number is required'),
  subcontractPrice: z.number().positive('Price must be greater than zero'),
  agreementDate: z.date({ required_error: 'Agreement date is required' }),
  primeContractOwner: z.string().min(1, 'Prime contract owner is required'),
  
  // Output options
  outputFormat: z.enum(['docx', 'pdf', 'both']),
  saveToDocuments: z.boolean(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  estimateId?: string;
  quoteId?: string;
  payeeId: string;
  onSuccess?: (result: ContractGenerationResponse) => void;
}

export function ContractGenerationModal({
  open,
  onOpenChange,
  projectId,
  estimateId,
  quoteId,
  payeeId,
  onSuccess,
}: ContractGenerationModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRCGSettings, setShowRCGSettings] = useState(false);

  // Fetch initial data
  const { fieldValues, isLoading, error } = useContractData({
    projectId,
    estimateId,
    quoteId,
    payeeId,
  });

  // Initialize form
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      outputFormat: 'both',
      saveToDocuments: true,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (fieldValues) {
      form.reset({
        // Subcontractor
        subcontractorCompany: fieldValues.subcontractor.company,
        subcontractorContactName: fieldValues.subcontractor.contactName,
        subcontractorContactTitle: fieldValues.subcontractor.contactTitle,
        subcontractorPhone: fieldValues.subcontractor.phone,
        subcontractorEmail: fieldValues.subcontractor.email,
        subcontractorAddress: fieldValues.subcontractor.address,
        subcontractorLegalForm: fieldValues.subcontractor.legalForm,
        subcontractorState: fieldValues.subcontractor.stateOfFormation,
        
        // Project
        projectNameNumber: fieldValues.project.projectNameNumber,
        projectLocation: fieldValues.project.location,
        propertyOwner: fieldValues.project.propertyOwner,
        projectStartDate: fieldValues.project.startDate 
          ? new Date(fieldValues.project.startDate) 
          : new Date(),
        projectEndDate: fieldValues.project.endDate 
          ? new Date(fieldValues.project.endDate) 
          : new Date(),
        
        // Contract
        subcontractNumber: fieldValues.contract.subcontractNumber,
        subcontractPrice: fieldValues.contract.subcontractPrice,
        agreementDate: new Date(fieldValues.contract.agreementDateShort),
        primeContractOwner: fieldValues.contract.primeContractOwner,
        
        // Output
        outputFormat: 'both',
        saveToDocuments: true,
      });
    }
  }, [fieldValues, form]);

  // Handle form submission
  const onSubmit = async (values: ContractFormValues) => {
    if (!fieldValues) return;

    setIsGenerating(true);

    try {
      // Build complete field values from form
      const completeFieldValues: ContractFieldValues = {
        subcontractor: {
          company: values.subcontractorCompany,
          legalForm: values.subcontractorLegalForm as any,
          stateOfFormation: values.subcontractorState as any,
          contactName: values.subcontractorContactName,
          contactTitle: values.subcontractorContactTitle || '',
          phone: values.subcontractorPhone || '',
          email: values.subcontractorEmail || '',
          address: values.subcontractorAddress,
          addressFormatted: values.subcontractorAddress,
        },
        project: {
          projectNameNumber: values.projectNameNumber,
          projectNumber: fieldValues.project.projectNumber,
          projectName: fieldValues.project.projectName,
          location: values.projectLocation,
          propertyOwner: values.propertyOwner,
          startDate: formatProjectDate(values.projectStartDate),
          endDate: formatProjectDate(values.projectEndDate),
        },
        contract: {
          subcontractNumber: values.subcontractNumber,
          subcontractPrice: values.subcontractPrice,
          subcontractPriceFormatted: formatCurrency(values.subcontractPrice),
          agreementDate: formatAgreementDate(values.agreementDate),
          agreementDateShort: format(values.agreementDate, 'yyyy-MM-dd'),
          primeContractOwner: values.primeContractOwner,
        },
        rcg: fieldValues.rcg,
      };

      // Validate
      const validation = validateContractFields(completeFieldValues);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        toast({
          title: 'Validation Error',
          description: firstError,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      // Call edge function
      const { data, error: fnError } = await supabase.functions.invoke('generate-contract', {
        body: {
          projectId,
          estimateId,
          quoteId,
          payeeId,
          fieldValues: completeFieldValues,
          outputFormat: values.outputFormat,
          saveToDocuments: values.saveToDocuments,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result = data as ContractGenerationResponse;

      if (!result.success) {
        throw new Error(result.error || 'Contract generation failed');
      }

      toast({
        title: 'Contract Generated',
        description: `Contract ${result.contractNumber} has been created successfully.`,
      });

      onSuccess?.(result);
      onOpenChange(false);
    } catch (err) {
      console.error('Contract generation error:', err);
      toast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Failed to generate contract',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading contract data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Failed to Load Data</h3>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Subcontractor Agreement
          </DialogTitle>
          <DialogDescription>
            Review and edit the contract details before generating the document.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Accordion type="multiple" defaultValue={['subcontractor', 'project', 'contract']} className="w-full">
              {/* Subcontractor Information */}
              <AccordionItem value="subcontractor">
                <AccordionTrigger className="text-base font-semibold">
                  Subcontractor Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subcontractorContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorContactTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., President, Owner" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcontractorPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 555-5555" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subcontractorEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subcontractorAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State of Formation *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATE_OPTIONS.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcontractorLegalForm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Form *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select legal form" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LEGAL_FORM_OPTIONS.map((form) => (
                                <SelectItem key={form.value} value={form.value}>
                                  {form.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Project Information */}
              <AccordionItem value="project">
                <AccordionTrigger className="text-base font-semibold">
                  Project Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="projectNameNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name/Number *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyOwner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Owner *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectEndDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Contract Details */}
              <AccordionItem value="contract">
                <AccordionTrigger className="text-base font-semibold">
                  Contract Details
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontract Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcontractPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontract Price *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="agreementDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Agreement Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primeContractOwner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prime Contract Owner *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* RCG Information (Collapsed by default) */}
              <AccordionItem value="rcg">
                <AccordionTrigger className="text-base font-semibold">
                  RCG Information (Company Defaults)
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  {fieldValues && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Legal Name:</span>
                        <span>{fieldValues.rcg.legalName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Display Name:</span>
                        <span>{fieldValues.rcg.displayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span>{fieldValues.rcg.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Signatory:</span>
                        <span>{fieldValues.rcg.signatoryName}, {fieldValues.rcg.signatoryTitle}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        To change RCG defaults, go to Settings → Company Information
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Output Options */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">Output Options</h4>
              
              <FormField
                control={form.control}
                name="outputFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="docx" id="docx" />
                          <Label htmlFor="docx">Generate DOCX only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pdf" id="pdf" />
                          <Label htmlFor="pdf">Generate PDF only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="both" id="both" />
                          <Label htmlFor="both">Generate DOCX + PDF</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="saveToDocuments"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">
                      Save to Project Documents
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Contract
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Part 5: Edge Function

### 5.1 Generate Contract Edge Function

```typescript
// supabase/functions/generate-contract/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Template placeholder mapping
const PLACEHOLDERS: Record<string, string> = {
  '{{SUBCONTRACTOR_COMPANY}}': 'subcontractor.company',
  '{{SUBCONTRACTOR_CONTACT}}': 'subcontractor.contactName',
  '{{SUBCONTRACTOR_PHONE}}': 'subcontractor.phone',
  '{{SUBCONTRACTOR_EMAIL}}': 'subcontractor.email',
  '{{SUBCONTRACTOR_ADDRESS}}': 'subcontractor.address',
  '{{SUBCONTRACTOR_LEGAL_FORM}}': 'subcontractor.legalForm',
  '{{SUBCONTRACTOR_STATE}}': 'subcontractor.stateOfFormation',
  '{{SUBCONTRACTOR_TITLE}}': 'subcontractor.contactTitle',
  '{{PROJECT_NAME_NUMBER}}': 'project.projectNameNumber',
  '{{PROJECT_LOCATION}}': 'project.location',
  '{{PROPERTY_OWNER}}': 'project.propertyOwner',
  '{{PROJECT_START_DATE}}': 'project.startDate',
  '{{PROJECT_END_DATE}}': 'project.endDate',
  '{{SUBCONTRACT_NUMBER}}': 'contract.subcontractNumber',
  '{{SUBCONTRACT_PRICE}}': 'contract.subcontractPriceFormatted',
  '{{AGREEMENT_DATE}}': 'contract.agreementDate',
  '{{PRIME_CONTRACT_OWNER}}': 'contract.primeContractOwner',
  '{{RCG_LEGAL_NAME}}': 'rcg.legalName',
  '{{RCG_DISPLAY_NAME}}': 'rcg.displayName',
  '{{RCG_ADDRESS}}': 'rcg.address',
  '{{RCG_SIGNATORY_NAME}}': 'rcg.signatoryName',
  '{{RCG_SIGNATORY_TITLE}}': 'rcg.signatoryTitle',
};

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string {
  const value = path.split('.').reduce((current, key) => current?.[key], obj);
  return value?.toString() || '';
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Replace placeholders in XML content
 */
function replacePlaceholders(xml: string, fieldValues: any): string {
  let result = xml;
  
  for (const [placeholder, path] of Object.entries(PLACEHOLDERS)) {
    const value = getNestedValue(fieldValues, path);
    const escapedValue = escapeXml(value);
    
    // Replace placeholder (may be split across XML tags)
    // Handle cases like: <w:t>{{SUBCONTRACTOR</w:t><w:t>_COMPANY}}</w:t>
    const cleanPlaceholder = placeholder.replace(/[{}]/g, '');
    const regex = new RegExp(
      `\\{\\{${cleanPlaceholder.replace(/_/g, '(?:</w:t>\\s*</w:r>\\s*<w:r[^>]*>\\s*<w:t[^>]*>)?_?')}\\}\\}`,
      'g'
    );
    result = result.replace(regex, escapedValue);
    
    // Also try simple replacement
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), escapedValue);
  }
  
  return result;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const {
      projectId,
      estimateId,
      quoteId,
      payeeId,
      fieldValues,
      outputFormat,
      saveToDocuments,
    } = await req.json();

    // Validate required fields
    if (!projectId || !payeeId || !fieldValues) {
      throw new Error('Missing required fields: projectId, payeeId, fieldValues');
    }

    console.log('Generating contract for project:', projectId);

    // Fetch template from storage
    const { data: templateData, error: templateError } = await supabase.storage
      .from('contract-templates')
      .download('subcontractor-agreement-template.docx');

    if (templateError) {
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    // Unzip the template
    const zip = new JSZip();
    await zip.loadAsync(await templateData.arrayBuffer());

    // Get document.xml
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Invalid template: missing document.xml');
    }

    // Replace placeholders in document.xml
    const processedDocumentXml = replacePlaceholders(documentXml, fieldValues);
    zip.file('word/document.xml', processedDocumentXml);

    // Also process header and footer files
    const headerFiles = Object.keys(zip.files).filter(f => f.match(/word\/header\d+\.xml/));
    const footerFiles = Object.keys(zip.files).filter(f => f.match(/word\/footer\d+\.xml/));

    for (const headerFile of headerFiles) {
      const content = await zip.file(headerFile)?.async('string');
      if (content) {
        zip.file(headerFile, replacePlaceholders(content, fieldValues));
      }
    }

    for (const footerFile of footerFiles) {
      const content = await zip.file(footerFile)?.async('string');
      if (content) {
        zip.file(footerFile, replacePlaceholders(content, fieldValues));
      }
    }

    // Generate DOCX buffer
    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Generate filename
    const contractNumber = fieldValues.contract.subcontractNumber;
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${contractNumber}_Agreement_${timestamp}`;

    // Upload DOCX to storage
    const docxPath = `contracts/${projectId}/${baseFilename}.docx`;
    const { error: docxUploadError } = await supabase.storage
      .from('project-documents')
      .upload(docxPath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (docxUploadError) {
      throw new Error(`Failed to upload DOCX: ${docxUploadError.message}`);
    }

    // Get DOCX URL
    const { data: docxUrlData } = supabase.storage
      .from('project-documents')
      .getPublicUrl(docxPath);

    let pdfUrl: string | null = null;
    let pdfPath: string | null = null;

    // Generate PDF if requested
    if (outputFormat === 'pdf' || outputFormat === 'both') {
      // Note: PDF conversion requires LibreOffice or similar
      // For MVP, we'll skip PDF and just return DOCX
      // TODO: Implement PDF conversion via LibreOffice or external service
      console.log('PDF generation not yet implemented - returning DOCX only');
    }

    // Create contract record in database
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        project_id: projectId,
        estimate_id: estimateId || null,
        quote_id: quoteId || null,
        payee_id: payeeId,
        contract_number: contractNumber,
        contract_type: 'subcontractor_agreement',
        subcontract_price: fieldValues.contract.subcontractPrice,
        agreement_date: fieldValues.contract.agreementDateShort,
        project_start_date: fieldValues.project.startDate,
        project_end_date: fieldValues.project.endDate,
        field_values: fieldValues,
        docx_storage_path: docxPath,
        docx_url: docxUrlData.publicUrl,
        pdf_storage_path: pdfPath,
        pdf_url: pdfUrl,
        status: 'generated',
      })
      .select()
      .single();

    if (contractError) {
      throw new Error(`Failed to create contract record: ${contractError.message}`);
    }

    // Optionally save to project_documents
    if (saveToDocuments) {
      await supabase.from('project_documents').insert({
        project_id: projectId,
        file_name: `${baseFilename}.docx`,
        file_url: docxUrlData.publicUrl,
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        document_type: 'contract',
        description: `Subcontractor Agreement - ${fieldValues.subcontractor.company}`,
      });
    }

    console.log('Contract generated successfully:', contract.id);

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contract.id,
        contractNumber: contract.contract_number,
        docxUrl: docxUrlData.publicUrl,
        pdfUrl: pdfUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Contract generation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## Part 6: Template Preparation

### 6.1 Template Setup Instructions

1. **Open the existing contract template** in Microsoft Word

2. **Replace static values with placeholders:**

   | Find | Replace With |
   |------|--------------|
   | `Markco Plumbing` | `{{SUBCONTRACTOR_COMPANY}}` |
   | `Mark Wilmink` | `{{SUBCONTRACTOR_CONTACT}}` |
   | `(859) 371-6217` | `{{SUBCONTRACTOR_PHONE}}` |
   | `mwilmink@markcoinc.com` | `{{SUBCONTRACTOR_EMAIL}}` |
   | `PO Box 1276, Florence, KY, 41042` | `{{SUBCONTRACTOR_ADDRESS}}` |
   | `[KY] [LLC]` | `[{{SUBCONTRACTOR_STATE}}] [{{SUBCONTRACTOR_LEGAL_FORM}}]` |
   | `[225-005] UC Neuro Suite 301 - UC Health` | `{{PROJECT_NAME_NUMBER}}` |
   | `UCH188560` | `{{SUBCONTRACT_NUMBER}}` |
   | `7675 Wellness Way, Suite 301, West Chester, OH, 45069` | `{{PROJECT_LOCATION}}` |
   | `UC Health` (property owner) | `{{PROPERTY_OWNER}}` |
   | `$63,323.00` | `{{SUBCONTRACT_PRICE}}` |
   | `12/1/2025` | `{{PROJECT_START_DATE}}` |
   | `3/1/2025` | `{{PROJECT_END_DATE}}` |
   | `11th day of June, 2025` | `{{AGREEMENT_DATE}}` |
   | `RCG LLC, a Kentucky limited liability company` | `{{RCG_LEGAL_NAME}}` |
   | `Radcliff Construction Group, LLC` | `{{RCG_DISPLAY_NAME}}` |
   | `23 Erlanger Road, Erlanger, KY 41017` | `{{RCG_ADDRESS}}` |
   | `Matt Radcliff` | `{{RCG_SIGNATORY_NAME}}` |
   | `President/Owner` | `{{RCG_SIGNATORY_TITLE}}` |
   | `[Owner]` (prime contract) | `{{PRIME_CONTRACT_OWNER}}` |

3. **Save as** `subcontractor-agreement-template.docx`

4. **Upload to Supabase Storage:**
   - Create bucket: `contract-templates`
   - Upload: `subcontractor-agreement-template.docx`

---

## Part 7: Integration Points

### 7.1 Add "Generate Contract" Button to Quote/Estimate Views

```typescript
// Add to QuoteDetailView or EstimateDetailView

// State for modal
const [showContractModal, setShowContractModal] = useState(false);

// Render button when quote is accepted
{quote.status === 'accepted' && (
  <Button onClick={() => setShowContractModal(true)}>
    <FileText className="mr-2 h-4 w-4" />
    Generate Contract
  </Button>
)}

// Render modal
<ContractGenerationModal
  open={showContractModal}
  onOpenChange={setShowContractModal}
  projectId={quote.project_id}
  quoteId={quote.id}
  payeeId={quote.payee_id}
  onSuccess={(result) => {
    // Handle success - maybe navigate to contract or show download
    console.log('Contract generated:', result);
  }}
/>
```

### 7.2 Add Contracts Tab to Project Detail View

```typescript
// Add to ProjectDetailView navigation
{
  label: "CONTRACTS & ESTIMATES",
  items: [
    { title: "Estimates & Quotes", url: "estimates", icon: FileText },
    { title: "Contracts", url: "contracts", icon: FileSignature }, // NEW
    { title: "Change Orders", url: "changes", icon: FileEdit },
  ],
},
```

---

## Part 8: Implementation Checklist

### Phase 1: Database Setup
- [ ] Run migration: Add fields to `payees` table
- [ ] Run migration: Create `contracts` table
- [ ] Run migration: Create `company_settings` table
- [ ] Insert default company settings

### Phase 2: Template Preparation
- [ ] Create copy of contract template
- [ ] Replace all values with placeholders
- [ ] Test template opens correctly in Word
- [ ] Create `contract-templates` storage bucket
- [ ] Upload template to storage

### Phase 3: Frontend Components
- [ ] Create `src/types/contract.ts`
- [ ] Create `src/constants/contractFields.ts`
- [ ] Create `src/utils/contractFormatters.ts`
- [ ] Create `src/utils/contractValidation.ts`
- [ ] Create `src/hooks/useContractData.ts`
- [ ] Create `src/components/contracts/ContractGenerationModal.tsx`

### Phase 4: Edge Function
- [ ] Create `supabase/functions/generate-contract/index.ts`
- [ ] Deploy edge function
- [ ] Test with sample data

### Phase 5: Integration
- [ ] Add "Generate Contract" button to Quote views
- [ ] Add Contracts tab to Project Detail
- [ ] Create ContractsListView component
- [ ] Test end-to-end flow

### Phase 6: Testing
- [ ] Test with various payee data (missing fields)
- [ ] Test placeholder replacement
- [ ] Verify generated DOCX opens correctly
- [ ] Test field validation
- [ ] Test on mobile devices

---

## Cursor AI Prompts

### Prompt 1: Database Migrations
```
Create the database migrations for the contract generation feature based on the spec in contract-generation-spec.md, Part 1. Create three separate migration files:
1. Add contract fields to payees table
2. Create contracts table  
3. Create company_settings table with default RCG values

Follow existing migration patterns in the project.
```

### Prompt 2: TypeScript Types and Constants
```
Create the TypeScript types and constants for contract generation based on contract-generation-spec.md Parts 2.1 and 2.2. Create:
1. src/types/contract.ts with all interfaces
2. src/constants/contractFields.ts with placeholder mapping and dropdown options

Follow existing type patterns in the project.
```

### Prompt 3: Utility Functions
```
Create the utility functions for contract generation based on contract-generation-spec.md Part 3. Create:
1. src/utils/contractFormatters.ts - date/currency formatting
2. src/utils/contractValidation.ts - field validation
3. src/hooks/useContractData.ts - data fetching hook

Follow existing patterns for hooks and utilities in the project.
```

### Prompt 4: Contract Generation Modal
```
Create the ContractGenerationModal component based on contract-generation-spec.md Part 4.1. The modal should:
1. Use shadcn-ui components (Dialog, Form, Accordion, etc.)
2. Pre-fill all fields from database
3. Allow editing before generation
4. Validate required fields
5. Call the generate-contract edge function

Follow existing modal patterns in the project (like QuickWorkOrderForm or ChangeOrderModal).
```

### Prompt 5: Edge Function
```
Create the generate-contract Supabase edge function based on contract-generation-spec.md Part 5.1. The function should:
1. Download template from storage
2. Unzip and replace placeholders in XML
3. Re-zip and upload to storage
4. Create contract record in database
5. Return URLs for download

Follow existing edge function patterns in the project.
```
