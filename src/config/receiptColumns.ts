export const receiptColumnDefinitions = [
  { key: 'preview', label: 'Preview', required: true, hiddenOnMobile: false },
  { key: 'type', label: 'Type', required: false, hiddenOnMobile: true, sortable: true },
  { key: 'payee', label: 'Vendor', required: true, hiddenOnMobile: false, sortable: true },
  { key: 'project', label: 'Project', required: true, hiddenOnMobile: true, sortable: true },
  { key: 'date', label: 'Date', required: true, hiddenOnMobile: false, sortable: true },
  { key: 'amount', label: 'Amount', required: false, hiddenOnMobile: false, sortable: true },
  { key: 'status', label: 'Status', required: false, hiddenOnMobile: true, sortable: true },
  { key: 'submitted_at', label: 'Submitted At', required: false, hiddenOnMobile: true, sortable: true },
  { key: 'submitted_by', label: 'Submitted By', required: false, hiddenOnMobile: true, sortable: true },
  { key: 'description', label: 'Description', required: false, hiddenOnMobile: true, sortable: true },
  { key: 'actions', label: 'Actions', required: true, hiddenOnMobile: false },
];

