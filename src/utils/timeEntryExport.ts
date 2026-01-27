import { format } from "date-fns";
import { TimeEntryListItem } from "@/types/timeEntry";
import { parseDateOnly } from "@/utils/dateUtils";

export const exportTimeEntriesToCSV = (entries: TimeEntryListItem[]) => {
  const headers = [
    "Work Date",           // expense_date - when work happened
    "Worker",
    "Employee #",
    "Project Number",
    "Project Name",
    "Client",
    "Project Address",
    "Start Time",
    "End Time",
    "Gross Hours",
    "Lunch Taken",
    "Lunch Duration (min)",
    "Net Hours",
    "Rate",
    "Amount",
    "Status",
    "Notes",
    "Created At",          // When record was created
    "Submitted At",        // When submitted for approval
    "Approved At",         // When approved
  ];

  const rows = entries.map((entry) => {
    const workDate = parseDateOnly(entry.expense_date);
    const startTime = entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "";
    const endTime = entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "";

    // Format timestamps correctly
    const createdAt = entry.created_at
      ? format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")
      : "";
    const submittedAt = entry.submitted_for_approval_at
      ? format(new Date(entry.submitted_for_approval_at), "yyyy-MM-dd HH:mm")
      : "";
    const approvedAt = entry.approved_at
      ? format(new Date(entry.approved_at), "yyyy-MM-dd HH:mm")
      : "";

    return [
      format(workDate, "yyyy-MM-dd"),      // Work Date
      entry.worker_name,
      entry.payee?.employee_number || "",
      entry.project_number,
      entry.project_name,
      entry.client_name,
      entry.project_address || "",
      startTime,
      endTime,
      entry.gross_hours?.toFixed(2) || entry.hours.toFixed(2),
      entry.lunch_taken ? "Yes" : "No",
      entry.lunch_taken ? (entry.lunch_duration_minutes?.toString() || "") : "",
      entry.hours.toFixed(2),
      entry.hourly_rate.toFixed(2),
      entry.amount.toFixed(2),
      entry.approval_status || "pending",
      entry.note || "",
      createdAt,
      submittedAt,
      approvedAt,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
