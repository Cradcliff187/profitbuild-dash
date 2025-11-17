import jsPDF from 'jspdf';

export interface ReportField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'percent';
}

export interface ExportOptions {
  reportName: string;
  fields: ReportField[];
  showDate?: boolean;
}

// Format value based on type
function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(value));
    
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    
    case 'date':
      if (value) {
        return new Date(value).toLocaleDateString();
      }
      return '';
    
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));
    
    default:
      return String(value);
  }
}

// Export to PDF
export async function exportToPDF(
  reportData: any[],
  options: ExportOptions
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const startX = margin;
  let currentY = margin;
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(options.reportName, startX, currentY);
  currentY += 8;
  
  if (options.showDate !== false) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, startX, currentY);
    currentY += 10;
  }
  
  if (reportData.length === 0) {
    doc.setFontSize(12);
    doc.text('No data available', startX, currentY);
    return doc.output('blob');
  }
  
  // Calculate column widths
  const numColumns = options.fields.length;
  const tableWidth = pageWidth - (2 * margin);
  const colWidth = tableWidth / numColumns;
  
  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const headerHeight = 8;
  doc.setFillColor(41, 128, 185);
  doc.rect(startX, currentY, tableWidth, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  
  options.fields.forEach((field, index) => {
    const x = startX + (index * colWidth);
    doc.text(field.label, x + 2, currentY + 6, {
      maxWidth: colWidth - 4,
      align: 'left'
    });
  });
  
  currentY += headerHeight;
  doc.setTextColor(0, 0, 0);
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  const rowHeight = 7;
  const maxRowsPerPage = Math.floor((pageHeight - currentY - 20) / rowHeight);
  
  reportData.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
      doc.addPage();
      currentY = margin;
    }
    
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
    }
    
    // Draw row data
    options.fields.forEach((field, colIndex) => {
      const x = startX + (colIndex * colWidth);
      const value = formatValue(row[field.key], field.type);
      doc.text(value.substring(0, 30), x + 2, currentY + 5, {
        maxWidth: colWidth - 4,
        align: 'left'
      });
    });
    
    currentY += rowHeight;
  });
  
  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  return doc.output('blob');
}

// Export to Excel (XLSX format using CSV as fallback, or TSV format)
// Note: Using TSV format that Excel can open since ExcelJS is not installed
export async function exportToExcel(
  reportData: any[],
  options: ExportOptions
): Promise<Blob> {
  // Use TSV format which Excel can open directly
  // Create header row (tab-separated)
  const headers = options.fields.map(f => escapeCSVField(f.label)).join('\t');
  
  // Create data rows
  const rows = reportData.map(row =>
    options.fields.map(f => {
      const value = row[f.key];
      // Format numbers properly for Excel
      if (f.type === 'currency' || f.type === 'number') {
        return value ? Number(value) : '';
      }
      return escapeCSVField(formatValue(value, f.type));
    }).join('\t')
  );
  
  // Combine
  const tsv = [headers, ...rows].join('\n');
  
  // Excel can open TSV files, so we return it with .xls extension
  return new Blob([tsv], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  });
}

// Export to CSV
export function exportToCSV(
  reportData: any[],
  options: ExportOptions
): Blob {
  // Create header row
  const headers = options.fields.map(f => escapeCSVField(f.label)).join(',');
  
  // Create data rows
  const rows = reportData.map(row =>
    options.fields.map(f => escapeCSVField(formatValue(row[f.key], f.type))).join(',')
  );
  
  // Combine
  const csv = [headers, ...rows].join('\n');
  
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// Escape CSV field
function escapeCSVField(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const stringValue = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Download blob helper
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

