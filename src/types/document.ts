export type DocumentType = 
  | 'drawing' 
  | 'permit' 
  | 'license' 
  | 'contract' 
  | 'specification' 
  | 'report'
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
  other: 'Other'
};

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
  other: '📎'
};
