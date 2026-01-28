import type { ContractType } from '@/types/contract';

/**
 * Contract types for dropdown and validation. Extensible for future contract types.
 */
export const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'subcontractor_project_agreement', label: 'Subcontractor Project Agreement' },
];

/**
 * Mapping of template placeholders to field paths.
 * Used by edge function for XML replacement.
 */
export const CONTRACT_TEMPLATE_PLACEHOLDERS = {
  '{{SUBCONTRACTOR_COMPANY}}': 'subcontractor.company',
  '{{SUBCONTRACTOR_CONTACT}}': 'subcontractor.contactName',
  '{{SUBCONTRACTOR_PHONE}}': 'subcontractor.phone',
  '{{SUBCONTRACTOR_EMAIL}}': 'subcontractor.email',
  '{{SUBCONTRACTOR_ADDRESS}}': 'subcontractor.address',
  '{{SUBCONTRACTOR_ADDRESS_FORMATTED}}': 'subcontractor.addressFormatted',
  '{{SUBCONTRACTOR_STREET_ADDRESS}}': 'subcontractor.streetAddress',
  '{{SUBCONTRACTOR_CITY_STATE_ZIP}}': 'subcontractor.cityStateZip',
  '{{SUBCONTRACTOR_LEGAL_ENTITY}}': 'subcontractor.legalEntity',
  '{{SUBCONTRACTOR_LEGAL_FORM}}': 'subcontractor.legalForm',
  '{{SUBCONTRACTOR_STATE}}': 'subcontractor.stateOfFormation',
  '{{SUBCONTRACTOR_TITLE}}': 'subcontractor.contactTitle',
  '{{PROJECT_NAME_NUMBER}}': 'project.projectNameNumber',
  '{{PROJECT_NUMBER}}': 'project.projectNumber',
  '{{PROJECT_NAME}}': 'project.projectName',
  '{{PROJECT_LOCATION}}': 'project.location',
  '{{PROPERTY_OWNER}}': 'project.propertyOwner',
  '{{PROJECT_START_DATE}}': 'project.startDate',
  '{{PROJECT_END_DATE}}': 'project.endDate',
  '{{SUBCONTRACT_NUMBER}}': 'contract.subcontractNumber',
  '{{SUBCONTRACT_PRICE}}': 'contract.subcontractPriceFormatted',
  '{{AGREEMENT_DATE}}': 'contract.agreementDate',
  '{{PRIME_CONTRACT_OWNER}}': 'contract.primeContractOwner',
  '{{LIST_OF_EXHIBITS}}': 'contract.listOfExhibits',
  '{{ARBITRATION_LOCATION}}': 'contract.arbitrationLocation',
  '{{DEFAULT_CURE_HOURS}}': 'contract.defaultCureHours',
  '{{DELAY_NOTICE_DAYS}}': 'contract.delayNoticeDays',
  '{{GOVERNING_COUNTY_STATE}}': 'contract.governingCountyState',
  '{{GOVERNING_STATE}}': 'contract.governingState',
  '{{INSURANCE_CANCELLATION_NOTICE_DAYS}}': 'contract.insuranceCancellationNoticeDays',
  '{{INSURANCE_LIMIT_1M}}': 'contract.insuranceLimit1m',
  '{{INSURANCE_LIMIT_2M}}': 'contract.insuranceLimit2m',
  '{{LIEN_CURE_DAYS}}': 'contract.lienCureDays',
  '{{LIQUIDATED_DAMAGES_DAILY}}': 'contract.liquidatedDamagesDaily',
  '{{NOTICE_CURE_DAYS}}': 'contract.noticeCureDays',
  '{{PAYMENT_TERMS_DAYS}}': 'contract.paymentTermsDays',
  '{{RCG_LEGAL_NAME}}': 'rcg.legalName',
  '{{RCG_DISPLAY_NAME}}': 'rcg.displayName',
  '{{RCG_ADDRESS}}': 'rcg.address',
  '{{RCG_STREET_ADDRESS}}': 'rcg.streetAddress',
  '{{RCG_CITY_STATE_ZIP}}': 'rcg.cityStateZip',
  '{{RCG_PHONE}}': 'rcg.phone',
  '{{RCG_EMAIL}}': 'rcg.email',
  '{{RCG_WEBSITE}}': 'rcg.website',
  '{{RCG_SIGNATORY_NAME}}': 'rcg.signatoryName',
  '{{RCG_SIGNATORY_TITLE}}': 'rcg.signatoryTitle',
} as const;

/**
 * Required fields for contract generation validation
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
  { value: 'LLC' as const, label: 'LLC (Limited Liability Company)' },
  { value: 'Corp' as const, label: 'Corporation' },
  { value: 'Inc' as const, label: 'Incorporated' },
  { value: 'S-Corp' as const, label: 'S-Corporation' },
  { value: 'Sole Proprietor' as const, label: 'Sole Proprietor' },
  { value: 'Partnership' as const, label: 'Partnership' },
  { value: 'LLP' as const, label: 'LLP (Limited Liability Partnership)' },
  { value: 'Other' as const, label: 'Other' },
];

/**
 * US State options for dropdown
 */
export const US_STATE_OPTIONS = [
  { value: 'AL' as const, label: 'Alabama' },
  { value: 'AK' as const, label: 'Alaska' },
  { value: 'AZ' as const, label: 'Arizona' },
  { value: 'AR' as const, label: 'Arkansas' },
  { value: 'CA' as const, label: 'California' },
  { value: 'CO' as const, label: 'Colorado' },
  { value: 'CT' as const, label: 'Connecticut' },
  { value: 'DE' as const, label: 'Delaware' },
  { value: 'FL' as const, label: 'Florida' },
  { value: 'GA' as const, label: 'Georgia' },
  { value: 'HI' as const, label: 'Hawaii' },
  { value: 'ID' as const, label: 'Idaho' },
  { value: 'IL' as const, label: 'Illinois' },
  { value: 'IN' as const, label: 'Indiana' },
  { value: 'IA' as const, label: 'Iowa' },
  { value: 'KS' as const, label: 'Kansas' },
  { value: 'KY' as const, label: 'Kentucky' },
  { value: 'LA' as const, label: 'Louisiana' },
  { value: 'ME' as const, label: 'Maine' },
  { value: 'MD' as const, label: 'Maryland' },
  { value: 'MA' as const, label: 'Massachusetts' },
  { value: 'MI' as const, label: 'Michigan' },
  { value: 'MN' as const, label: 'Minnesota' },
  { value: 'MS' as const, label: 'Mississippi' },
  { value: 'MO' as const, label: 'Missouri' },
  { value: 'MT' as const, label: 'Montana' },
  { value: 'NE' as const, label: 'Nebraska' },
  { value: 'NV' as const, label: 'Nevada' },
  { value: 'NH' as const, label: 'New Hampshire' },
  { value: 'NJ' as const, label: 'New Jersey' },
  { value: 'NM' as const, label: 'New Mexico' },
  { value: 'NY' as const, label: 'New York' },
  { value: 'NC' as const, label: 'North Carolina' },
  { value: 'ND' as const, label: 'North Dakota' },
  { value: 'OH' as const, label: 'Ohio' },
  { value: 'OK' as const, label: 'Oklahoma' },
  { value: 'OR' as const, label: 'Oregon' },
  { value: 'PA' as const, label: 'Pennsylvania' },
  { value: 'RI' as const, label: 'Rhode Island' },
  { value: 'SC' as const, label: 'South Carolina' },
  { value: 'SD' as const, label: 'South Dakota' },
  { value: 'TN' as const, label: 'Tennessee' },
  { value: 'TX' as const, label: 'Texas' },
  { value: 'UT' as const, label: 'Utah' },
  { value: 'VT' as const, label: 'Vermont' },
  { value: 'VA' as const, label: 'Virginia' },
  { value: 'WA' as const, label: 'Washington' },
  { value: 'WV' as const, label: 'West Virginia' },
  { value: 'WI' as const, label: 'Wisconsin' },
  { value: 'WY' as const, label: 'Wyoming' },
  { value: 'DC' as const, label: 'District of Columbia' },
];

/** Template filename per contract type (for edge function) */
export const CONTRACT_TEMPLATE_FILENAMES: Record<ContractType, string> = {
  subcontractor_project_agreement: 'subcontractor-project-agreement-template.docx',
};
