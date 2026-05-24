export type DocumentType =
  | 'drawing'
  | 'permit'
  | 'license'
  | 'contract'
  | 'specification'
  | 'report'
  | 'invoice'
  | 'quote'
  | 'aia-g702'
  | 'aia-g703'
  | 'other';

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  description?: string;
  version_number: number;
  uploaded_by?: string;
  expires_at?: string;
  related_quote_id?: string;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  drawing: 'Drawing/Plan',
  permit: 'Permit',
  license: 'License',
  contract: 'Contract',
  specification: 'Specification',
  report: 'Report',
  invoice: 'Invoice',
  quote: 'Quote',
  'aia-g702': 'AIA G702',
  'aia-g703': 'AIA G703',
  other: 'Other'
};

/**
 * Document types an admin/manager may manually assign in the document editor.
 * Excludes system-generated AIA billing artifacts ('aia-g702' / 'aia-g703'),
 * which get labels (above) so they render correctly but are never hand-tagged.
 */
export const ASSIGNABLE_DOCUMENT_TYPES: DocumentType[] = [
  'drawing',
  'permit',
  'license',
  'contract',
  'specification',
  'report',
  'invoice',
  'quote',
  'other',
];

/**
 * @deprecated Use DOCUMENT_TYPE_LUCIDE_ICONS from '@/utils/documentFileType' instead.
 * Emoji icons are being replaced with Lucide icons for professional consistency.
 */
export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  drawing: '📐',
  permit: '📋',
  license: '📜',
  contract: '📄',
  specification: '📝',
  report: '📊',
  invoice: '🧾',
  quote: '💬',
  'aia-g702': '🏛️',
  'aia-g703': '🏛️',
  other: '📎'
};
