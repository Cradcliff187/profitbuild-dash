import { format } from 'date-fns';

interface ReceiptForExport {
  id: string;
  type: 'time_entry' | 'standalone';
  payee_name: string;
  project_number: string;
  project_name: string;
  date: string;
  amount: number;
  description?: string;
  hours?: number;
  approval_status?: string;
  submitted_for_approval_at?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export const exportReceiptsToCSV = (receipts: ReceiptForExport[]) => {
  if (receipts.length === 0) {
    return;
  }

  // CSV Headers
  const headers = [
    'Type',
    'Payee/Worker',
    'Project Number',
    'Project Name',
    'Date',
    'Hours',
    'Amount',
    'Status',
    'Description',
    'Submitted At',
    'Approved At',
    'Rejection Reason'
  ];

  // Build CSV rows
  const rows = receipts.map(r => [
    r.type === 'time_entry' ? 'Time Entry Receipt' : 'Standalone Receipt',
    r.payee_name || '',
    r.project_number || '',
    r.project_name || '',
    format(new Date(r.date), 'yyyy-MM-dd'),
    r.hours !== undefined ? r.hours.toFixed(2) : '',
    r.amount.toFixed(2),
    r.approval_status || 'pending',
    (r.description || '').replace(/,/g, ';'), // Escape commas
    r.submitted_for_approval_at ? format(new Date(r.submitted_for_approval_at), 'yyyy-MM-dd HH:mm') : '',
    r.approved_at ? format(new Date(r.approved_at), 'yyyy-MM-dd HH:mm') : '',
    (r.rejection_reason || '').replace(/,/g, ';'), // Escape commas
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `receipts_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
