import { useState } from "react";
import { Clock, ChevronDown, Edit, XCircle, Eye, CheckCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TimeEntry {
  id: string;
  user_id: string;
  payee_id: string;
  worker_name: string;
  payee?: {
    employee_number?: string;
  };
  project_id: string;
  project_name: string;
  project_number: string;
  expense_date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  lunch_duration_minutes?: number;
  amount: number;
  approval_status: string;
  created_at: string;
  attachment_url?: string;
}

interface TimeEntriesCardViewProps {
  timeEntries: TimeEntry[];
  selectedIds: string[];
  onSelectOne: (id: string, checked: boolean) => void;
  onEdit: (entry: TimeEntry) => void;
  onReject: (entry: TimeEntry) => void;
  onRefresh: () => void;
  canApprove: boolean;
  canReject: boolean;
  totalCount: number;
  pagination: any;
  pageSize: number;
  setPageSize: (size: number) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const TimeEntriesCardView = ({
  timeEntries,
  selectedIds,
  onSelectOne,
  onEdit,
  onReject,
  onRefresh,
  canApprove,
  canReject,
  totalCount,
  pagination,
  pageSize,
  setPageSize,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onClearSelection,
}: TimeEntriesCardViewProps) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleApprove = async (entry: TimeEntry) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ approval_status: "approved" })
        .eq("id", entry.id);

      if (error) throw error;

      toast({
        title: "Entry Approved",
        description: "Time entry has been approved successfully.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error approving entry:", error);
      toast({
        title: "Error",
        description: "Failed to approve time entry.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "border-success text-success bg-success/10";
      case "rejected":
        return "border-destructive text-destructive bg-destructive/10";
      case "pending":
        return "border-warning text-warning bg-warning/10";
      default:
        return "border-primary text-primary bg-primary/10";
    }
  };

  if (timeEntries.length === 0) {
    return (
      <Card className="compact-card">
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-4">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No time entries found</p>
            <p className="text-xs mt-1">
              Time entries will appear here once they are submitted
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dense-spacing">
      <div className="space-y-2">
        {/* Bulk Actions Bar - Mobile */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col items-stretch gap-2 p-2 bg-muted border rounded-md">
            <span className="text-xs font-medium">
              {selectedIds.length} {selectedIds.length === 1 ? 'entry' : 'entries'} selected
            </span>
            <div className="flex flex-wrap gap-1.5">
              {canApprove && (
                <Button size="sm" variant="default" onClick={onBulkApprove} className="flex-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              )}
              {canReject && (
                <Button size="sm" variant="destructive" onClick={onBulkReject} className="flex-1">
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onBulkDelete} className="flex-1">
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearSelection} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}
        {timeEntries.map((entry) => {
          const isExpanded = expandedCards.has(entry.id);
          
          return (
            <Card key={entry.id} className="compact-card border border-primary/10 hover:bg-muted/50 transition-colors">
              <CardHeader className="p-3 pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <CardTitle className="text-sm font-medium flex-1 min-w-0 truncate">
                          {entry.worker_name}
                          {entry.payee?.employee_number && ` (#${entry.payee.employee_number})`}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`compact-badge capitalize flex-shrink-0 ${getStatusBadgeClass(entry.approval_status)}`}
                        >
                          {entry.approval_status || "pending"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.project_number ? `${entry.project_number} - ${entry.project_name}` : entry.project_name}
                      </p>
                    </div>
                    <div>
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onCheckedChange={(checked) => onSelectOne(entry.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                {/* Always visible row with key info and chevron */}
                <div className="flex items-center justify-between px-3 py-2 border-t">
                  <span className="text-sm font-medium">
                    {entry.hours}h • {formatCurrency(entry.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCards((prev) => {
                        const next = new Set(prev);
                        if (next.has(entry.id)) {
                          next.delete(entry.id);
                        } else {
                          next.add(entry.id);
                        }
                        return next;
                      });
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </div>

                {/* Collapsible content */}
                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="compact-card-section border border-primary/20">
                      <div className="space-y-2">
                        {/* Date and Time Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">Date</div>
                            <div className="font-medium">
                              {format(new Date(entry.expense_date), "MMM dd, yyyy")}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Hours</div>
                            <div className="font-medium">{entry.hours}h</div>
                          </div>
                          {entry.start_time && (
                            <div>
                              <div className="text-muted-foreground">Start</div>
                              <div className="font-medium">{format(new Date(entry.start_time), "HH:mm")}</div>
                            </div>
                          )}
                          {entry.end_time && (
                            <div>
                              <div className="text-muted-foreground">End</div>
                              <div className="font-medium">{format(new Date(entry.end_time), "HH:mm")}</div>
                            </div>
                          )}
                          {entry.lunch_duration_minutes && entry.lunch_duration_minutes > 0 && (
                            <div>
                              <div className="text-muted-foreground">Lunch</div>
                              <div className="font-medium">{entry.lunch_duration_minutes}min</div>
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="pt-2 border-t border-primary/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <span className="text-lg font-bold font-mono">
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                        </div>

                        {/* Submitted Info */}
                        {entry.created_at && (
                          <div className="text-xs text-muted-foreground">
                            Submitted {format(new Date(entry.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-1 pt-2">
                          {entry.approval_status === "pending" && canApprove && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(entry)}
                              className="flex-1 h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {entry.approval_status === "pending" && canReject && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReject(entry)}
                              className="flex-1 h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(entry)}
                            className="flex-1 h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}

        {/* Mobile Pagination */}
        {totalCount > 0 && (
          <div className="p-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  pagination.goToPage(1);
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>

            {totalCount > pageSize && (
              <div className="w-full sm:w-auto flex justify-center sm:justify-end overflow-x-auto">
                <CompletePagination
                  currentPage={pagination.currentPage}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  onPageChange={pagination.goToPage}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
