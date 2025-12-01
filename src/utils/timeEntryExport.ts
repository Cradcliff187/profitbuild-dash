import { format } from "date-fns";
import { TimeEntryListItem } from "@/types/timeEntry";

export const exportTimeEntriesToCSV = (entries: TimeEntryListItem[]) => {
  const headers = [
    "Date",
    "Worker",
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
    "Submitted At",
  ];

  const rows = entries.map((entry) => {
    const entryDate = new Date(entry.expense_date + "T12:00:00");
    const startTime = entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "";
    const endTime = entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "";
    const submittedAt = format(new Date(entry.created_at), "yyyy-MM-dd HH:mm");

    return [
      format(entryDate, "yyyy-MM-dd"),
      entry.worker_name,
      entry.project_number,
      entry.project_name,
      entry.client_name,
      entry.project_address || "",
      startTime,
      endTime,
      entry.gross_hours?.toFixed(2) || entry.hours.toFixed(2),
      entry.lunch_taken ? "Yes" : "No",
      entry.lunch_taken ? (entry.lunch_duration_minutes?.toString() || "") : "",
      entry.hours.toFixed(2),  // Net hours
      entry.hourly_rate.toFixed(2),
      entry.amount.toFixed(2),
      entry.approval_status || "pending",
      entry.note || "",
      submittedAt,
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
