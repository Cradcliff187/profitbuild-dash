import React from 'react';
import {
  FileText,
  Image,
  Video,
  Receipt,
  FileCheck,
  Ruler,
  ClipboardCheck,
  Award,
  FileSpreadsheet,
  Presentation,
  File,
} from 'lucide-react';
import type { DocumentType } from '@/types/document';
import { cn } from '@/lib/utils';

// ============================================================================
// LUCIDE ICON MAPPING (replaces emoji DOCUMENT_TYPE_ICONS)
// ============================================================================

export const DOCUMENT_TYPE_LUCIDE_ICONS: Record<DocumentType, React.ComponentType<{ className?: string }>> = {
  drawing: Ruler,
  permit: ClipboardCheck,
  license: Award,
  contract: FileCheck,
  specification: FileText,
  report: FileSpreadsheet,
  other: File,
};

// Color classes for document type icons
export const DOCUMENT_TYPE_ICON_COLORS: Record<DocumentType, string> = {
  drawing: 'text-blue-600',
  permit: 'text-amber-600',
  license: 'text-green-600',
  contract: 'text-purple-600',
  specification: 'text-slate-600',
  report: 'text-cyan-600',
  other: 'text-muted-foreground',
};

// ============================================================================
// FILE TYPE DETECTION (for preview routing)
// ============================================================================

export type PreviewableFileType = 'pdf' | 'image' | 'video' | 'office' | 'receipt' | 'other';

export function detectFileType(
  mimeType?: string | null,
  fileUrl?: string | null,
  fileName?: string | null
): PreviewableFileType {
  const mime = mimeType?.toLowerCase() || '';
  const url = fileUrl?.toLowerCase() || '';
  const name = fileName?.toLowerCase() || '';

  // PDF
  if (mime.includes('pdf') || url.includes('.pdf') || name.includes('.pdf')) return 'pdf';

  // Image
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)/.test(url) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)/.test(name)) return 'image';

  // Video
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|avi)/.test(url) || /\.(mp4|mov|webm|avi)/.test(name)) return 'video';

  // Office documents
  if (
    mime.includes('wordprocessingml') || mime.includes('msword') ||
    mime.includes('spreadsheetml') || mime.includes('ms-excel') ||
    mime.includes('presentationml') || mime.includes('ms-powerpoint') ||
    /\.(doc|docx|xls|xlsx|ppt|pptx)/.test(url) || /\.(doc|docx|xls|xlsx|ppt|pptx)/.test(name)
  ) return 'office';

  return 'other';
}

export function detectOfficeSubtype(
  mimeType?: string | null,
  fileUrl?: string | null,
  fileName?: string | null
): 'word' | 'excel' | 'powerpoint' | undefined {
  const mime = mimeType?.toLowerCase() || '';
  const url = fileUrl?.toLowerCase() || '';
  const name = fileName?.toLowerCase() || '';

  if (mime.includes('wordprocessingml') || mime.includes('msword') || /\.docx?/.test(url) || /\.docx?/.test(name)) return 'word';
  if (mime.includes('spreadsheetml') || mime.includes('ms-excel') || /\.xlsx?/.test(url) || /\.xlsx?/.test(name)) return 'excel';
  if (mime.includes('presentationml') || mime.includes('ms-powerpoint') || /\.pptx?/.test(url) || /\.pptx?/.test(name)) return 'powerpoint';
  return undefined;
}

// ============================================================================
// DOCUMENT LEADING ICON COMPONENT
// ============================================================================

interface DocumentLeadingProps {
  documentType?: DocumentType;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  fileUrl?: string | null;
  size?: number; // pixels, default 40
}

export function DocumentLeadingIcon({
  documentType = 'other',
  thumbnailUrl,
  mimeType,
  fileUrl,
  size = 40,
}: DocumentLeadingProps): React.ReactElement {
  // If we have a thumbnail (images, videos with thumbnails), show it
  if (thumbnailUrl) {
    return React.createElement(
      'div',
      {
        className: 'rounded-lg overflow-hidden bg-muted flex-shrink-0',
        style: { width: size, height: size },
      },
      React.createElement('img', {
        src: thumbnailUrl,
        alt: '',
        className: 'w-full h-full object-cover',
        loading: 'lazy',
      })
    );
  }

  // Otherwise show a colored Lucide icon
  const IconComponent = DOCUMENT_TYPE_LUCIDE_ICONS[documentType] || File;
  const colorClass = DOCUMENT_TYPE_ICON_COLORS[documentType] || 'text-muted-foreground';

  return React.createElement(
    'div',
    {
      className: cn(
        'rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0'
      ),
      style: { width: size, height: size },
    },
    React.createElement(IconComponent, { className: cn('w-5 h-5', colorClass) })
  );
}
