import { format } from 'date-fns';
import type { ProjectMedia } from '@/types/project';

/**
 * Generate a standardized PDF filename
 */
export const generatePDFFileName = (params: {
  projectName: string;
  projectNumber: string;
  itemCount: number;
  reportType?: string;
}): string => {
  const { projectName, projectNumber, itemCount, reportType = 'Media-Report' } = params;
  const date = format(new Date(), 'yyyy-MM-dd');
  
  // Sanitize project name (remove special chars, limit length)
  const safeName = projectName
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  
  // Sanitize project number
  const safeNumber = projectNumber.replace(/[^a-z0-9]/gi, '-');
  
  return `${safeName}-${safeNumber}-${reportType}-${itemCount}items-${date}.pdf`;
};

/**
 * Validate media items and separate valid from invalid
 */
export const validateMediaItems = (items: ProjectMedia[]): {
  valid: ProjectMedia[];
  invalid: ProjectMedia[];
} => {
  const valid: ProjectMedia[] = [];
  const invalid: ProjectMedia[] = [];
  
  items.forEach(item => {
    if (item.file_url && item.file_name) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  });
  
  return { valid, invalid };
};

/**
 * Estimate PDF file size based on item count
 */
export const estimatePDFSize = (itemCount: number): string => {
  // Rough estimate: ~300KB per item (image compression + metadata)
  const sizeInMB = (itemCount * 0.3);
  
  if (sizeInMB < 1) {
    return `~${Math.round(sizeInMB * 1024)} KB`;
  }
  
  return `~${sizeInMB.toFixed(1)} MB`;
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
