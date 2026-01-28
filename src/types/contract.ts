/**
 * Contract type enumeration. Database stores these values; extensible for future contract types.
 */
export type ContractType = 'subcontractor_project_agreement';

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
  company: string;
  legalForm: LegalFormType;
  stateOfFormation: USState;
  contactName: string;
  contactTitle: string;
  phone: string;
  email: string;
  address: string;
  addressFormatted: string;
}

/**
 * Project information for contract generation
 */
export interface ProjectInfo {
  projectNameNumber: string;
  projectNumber: string;
  projectName: string;
  location: string;
  propertyOwner: string;
  startDate: string;
  endDate: string;
}

/**
 * Contract details for generation
 */
export interface ContractDetails {
  subcontractNumber: string;
  subcontractPrice: number;
  subcontractPriceFormatted: string;
  agreementDate: string;
  agreementDateShort: string;
  primeContractOwner: string;
  listOfExhibits?: string;
  /** Terms & conditions placeholders (defaults from company_settings, editable per contract) */
  arbitrationLocation?: string;
  defaultCureHours?: string;
  delayNoticeDays?: string;
  governingCountyState?: string;
  governingState?: string;
  insuranceCancellationNoticeDays?: string;
  insuranceLimit1m?: string;
  insuranceLimit2m?: string;
  lienCureDays?: string;
  liquidatedDamagesDaily?: string;
  noticeCureDays?: string;
  paymentTermsDays?: string;
}

/**
 * RCG company information (from settings)
 */
export interface RCGInfo {
  legalName: string;
  displayName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  signatoryName: string;
  signatoryTitle: string;
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
  contractType: ContractType;
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
  contractType?: ContractType;
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
  contract_type: ContractType;
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
