import React, { useState } from "react";
import { Eye, Trash2, MoreHorizontal, ExternalLink, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { MobileListCard } from "@/components/ui/mobile-list-card";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CompletePagination } from "@/components/ui/complete-pagination";
import type { BranchBid } from "@/types/bid";
import { formatLeadSource, formatLeadStage, leadStageBadgeClass } from "@/utils/leadLabels";
import { BID_COLUMN_DEFINITIONS } from "@/components/bids/leadListConfig";
import {
  ATTENTION_LABELS,
  attentionBadgeClass,
  describeDue,
  describeLastContact,
  getLeadAttention,
} from "@/utils/leadAttention";

/** Every job linked to a lead, falling back to the legacy single project_id mirror. */
const linkedJobs = (bid: BranchBid) => {
  const links = (bid.branch_bid_projects ?? [])
    .filter((l) => l.projects)
    .map((l) => ({ id: l.project_id, number: l.projects!.project_number, name: l.projects!.project_name }));
  if (links.length > 0) return links;
  if (bid.project_id && bid.projects) {
    return [{ id: bid.project_id, number: bid.projects.project_number, name: bid.projects.project_name }];
  }
  return [];
};

interface BidsTableViewProps {
  bids: BranchBid[];
  onDelete?: (bidId: string) => void;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
  visibleColumns?: string[];
  columnOrder?: string[];
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  renderSortIcon?: (columnKey: string) => React.ReactNode;
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const BidsTableView = ({
  bids,
  onDelete,
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  visibleColumns = [],
  columnOrder = [],
  sortColumn = null,
  sortDirection = 'asc',
  onSort,
  renderSortIcon,
  totalCount,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}: BidsTableViewProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; bid: BranchBid | null}>({
    open: false,
    bid: null
  });

  const columnDefinitions = BID_COLUMN_DEFINITIONS;

  // min-w-[...] lets the browser distribute remaining space instead of forcing
  // horizontal scroll at tablet widths. Pairs with `truncate` on name/client
  // cells (below) so long strings ellipsize.
  const widths: Record<string, string> = {
    name: "min-w-[200px]",
    stage: "min-w-[130px]",
    next_step: "min-w-[220px]",
    last_contact: "min-w-[110px]",
    owner: "min-w-[120px]",
    contact: "min-w-[160px]",
    source: "min-w-[120px]",
    client_name: "min-w-[160px]",
    created_at: "min-w-[110px]",
    project: "min-w-[140px]",
    created_by: "min-w-[130px]",
    actions: "w-12",
  };
  
  const alignments: Record<string, string> = {
    created_at: "text-right",
    actions: "text-right",
  };
  
  const labels: Record<string, string> = Object.fromEntries(
    BID_COLUMN_DEFINITIONS.map((c) => [c.key, c.label])
  );

  const handleViewDetails = (bid: BranchBid) => {
    navigate(`/leads/${bid.id}`);
  };

  const handleDeleteClick = (bid: BranchBid, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, bid });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.bid && onDelete) {
      onDelete(deleteConfirm.bid.id);
      setDeleteConfirm({ open: false, bid: null });
    }
  };

  const paginationFooter = (totalCount ?? 0) > 0 && pageSize ? (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            if (onPageSizeChange) {
              onPageSizeChange(Number(e.target.value));
            }
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>

      {(totalCount ?? 0) > pageSize && onPageChange && currentPage !== undefined && totalPages !== undefined && (
        <CompletePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  ) : null;

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12">
            <div className="text-xs text-muted-foreground">Loading leads...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bids.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="text-center py-12">
            <p className="text-xs text-muted-foreground mb-2">No leads match</p>
            <p className="text-xs text-muted-foreground">
              Closed leads are hidden by default — switch the Open / closed filter to see them.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-2">
          {bids.map((bid) => {
            const jobs = linkedJobs(bid);
            const attention = getLeadAttention(bid);
            const dueLabel = describeDue(bid.next_step_due);
            return (
            <MobileListCard
              key={bid.id}
              title={bid.name}
              subtitle={[bid.contacts?.name, bid.clients?.client_name].filter(Boolean).join(' · ') || 'No person yet'}
              badge={{
                label: formatLeadStage(bid.stage).toUpperCase(),
                // Semantic tokens (dark-mode safe) — same map the detail pill uses.
                className: cn('border', leadStageBadgeClass(bid.stage)),
              }}
              secondaryBadge={attention !== 'none' ? { label: ATTENTION_LABELS[attention], className: cn('border', attentionBadgeClass(attention)) } : undefined}
              metrics={[
                {
                  label: 'Next step',
                  value: bid.next_step || bid.next_step_due
                    ? <span className="line-clamp-2">{bid.next_step || 'Follow up'}{dueLabel ? <span className="text-muted-foreground"> · {dueLabel}</span> : null}</span>
                    : <span className="text-muted-foreground">None</span>,
                },
                {
                  label: 'Last contact',
                  value: describeLastContact(bid.last_contact_at),
                },
                {
                  label: 'Owner',
                  value: bid.owner_name || <span className="text-muted-foreground">—</span>,
                },
                {
                  label: jobs.length > 1 ? 'Jobs' : 'Job',
                  value: jobs.length === 0 ? '—' : jobs.map((j) => j.number).join(', '),
                },
              ]}
              onTap={() => handleViewDetails(bid)}
              actions={[
                {
                  icon: Trash2,
                  label: 'Delete',
                  onClick: (e) => handleDeleteClick(bid, e),
                  variant: 'destructive' as const,
                },
              ]}
            />
            );
          })}
        </div>

        {paginationFooter && (
          <div className="mt-3 px-2">
            {paginationFooter}
          </div>
        )}

        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, bid: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteConfirm.bid?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto -mx-2 px-2 sm:mx-0 sm:px-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-20 border-b">
                <TableRow className="h-8">
                  {onSelectAll && (
                    <TableHead className="w-10 p-2">
                      <Checkbox
                        checked={selectedIds.length === bids.length && bids.length > 0}
                        onCheckedChange={onSelectAll}
                      />
                    </TableHead>
                  )}
                  {columnOrder.map((colKey) => {
                    if (!visibleColumns.includes(colKey)) return null;
                    
                    const column = columnDefinitions.find(col => col.key === colKey);
                    const isSortable = column?.sortable;

                    return (
                      <TableHead 
                        key={colKey} 
                        className={cn(
                          `p-2 text-xs font-medium h-8 ${widths[colKey] || ''} ${alignments[colKey] || ''}`,
                          isSortable && onSort && "cursor-pointer hover:text-foreground select-none"
                        )}
                        onClick={() => isSortable && onSort && onSort(colKey)}
                      >
                        <div className={cn(
                          "flex items-center",
                          alignments[colKey] === "text-right" && "justify-end",
                          alignments[colKey] === "text-center" && "justify-center"
                        )}>
                          {labels[colKey]}
                          {renderSortIcon && renderSortIcon(colKey)}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid) => (
                  <TableRow 
                    key={bid.id} 
                    className="h-9 hover:bg-muted/50 even:bg-muted/20 cursor-pointer"
                    onClick={() => handleViewDetails(bid)}
                  >
                    {onSelectOne && (
                      <TableCell className="p-1.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(bid.id)}
                          onCheckedChange={(checked) => onSelectOne(bid.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    {columnOrder.map((colKey) => {
                      if (!visibleColumns.includes(colKey)) return null;

                      switch (colKey) {
                        case "name":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs font-medium">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{bid.name}</div>
                                {bid.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {bid.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        case "stage":
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              <Badge
                                variant="outline"
                                className={cn("h-5 border px-1.5 text-[10px] font-medium", leadStageBadgeClass(bid.stage))}
                              >
                                {formatLeadStage(bid.stage)}
                              </Badge>
                            </TableCell>
                          );
                        case "next_step": {
                          const attention = getLeadAttention(bid);
                          const dueLabel = describeDue(bid.next_step_due);
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {bid.next_step || bid.next_step_due ? (
                                <div className="min-w-0">
                                  <div className="truncate" title={bid.next_step ?? undefined}>{bid.next_step || 'Follow up'}</div>
                                  {dueLabel && (
                                    <Badge variant="outline" className={cn("mt-0.5 h-4 border px-1.5 text-[10px] font-medium", attentionBadgeClass(attention) || "border-border text-muted-foreground")}>
                                      {dueLabel}
                                    </Badge>
                                  )}
                                </div>
                              ) : attention !== 'none' ? (
                                <Badge variant="outline" className={cn("h-4 border px-1.5 text-[10px] font-medium", attentionBadgeClass(attention))}>
                                  {ATTENTION_LABELS[attention]}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        }
                        case "last_contact":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {describeLastContact(bid.last_contact_at)}
                            </TableCell>
                          );
                        case "owner":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {bid.owner_name || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          );
                        case "contact":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {bid.contacts ? (
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">{bid.contacts.name}</div>
                                    {(bid.contacts.phone || bid.contacts.email) && (
                                      <div className="truncate text-[11px] text-muted-foreground">{bid.contacts.phone || bid.contacts.email}</div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        case "source":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              <div className="min-w-0">
                                <div className="truncate">{formatLeadSource(bid.source)}</div>
                                {bid.source_detail && (
                                  <div className="truncate text-[11px] text-muted-foreground" title={bid.source_detail}>
                                    {bid.source_detail}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        case "client_name":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {bid.clients ? (
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{bid.clients.client_name}</div>
                                  {bid.clients.company_name && (
                                    <div className="text-xs text-muted-foreground truncate">{bid.clients.company_name}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        case "created_at":
                          return (
                            <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                              {format(new Date(bid.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          );
                        case "project": {
                          const jobs = linkedJobs(bid);
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              {jobs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {jobs.map((j) => (
                                    <Badge
                                      key={j.id}
                                      variant="secondary"
                                      className="h-4 px-1.5 text-[10px]"
                                      title={`${j.number} ${j.name}`}
                                    >
                                      <ExternalLink className="mr-1 h-2.5 w-2.5" />
                                      {j.number}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        }
                        case "created_by":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {bid.profiles?.full_name || 'Unknown'}
                            </TableCell>
                          );
                        case "actions":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => handleViewDetails(bid)}>
                                    <Eye className="h-3 w-3 mr-2" />
                                    Open
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => handleDeleteClick(bid, e)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {paginationFooter && (
            <div className="p-3 border-t">
              {paginationFooter}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, bid: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.bid?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
