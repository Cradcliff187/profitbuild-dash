export type DocumentType = 
  | 'drawing' 
  | 'permit' 
  | 'license' 
  | 'contract' 
  | 'specification' 
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
  other: 'Other'
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  drawing: '📐',
  permit: '📋',
  license: '📜',
  contract: '📄',
  specification: '📝',
  other: '📎'
};
