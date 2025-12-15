export const timeEntryColumnDefinitions = [
  { key: "worker", label: "Worker", required: true, sortable: true },
  { key: "employee_number", label: "Employee #", required: false, sortable: true },
  { key: "project", label: "Project", required: true, sortable: true },
  { key: "address", label: "Project Address", required: false, sortable: true },
  { key: "date", label: "Date", required: true, sortable: true },
  { key: "start", label: "Start Time", required: false, sortable: true },
  { key: "end", label: "End Time", required: false, sortable: true },
  { key: "hours", label: "Hours", required: false, sortable: true },
  { key: "lunch", label: "Lunch", required: false, sortable: false },
  { key: "amount", label: "Amount", required: false, sortable: true },
  { key: "receipt", label: "Receipt", required: false, sortable: true },
  { key: "status", label: "Status", required: false, sortable: true },
  { key: "submitted_at", label: "Submitted At", required: false, sortable: true },
  { key: "actions", label: "Actions", required: true },
];

