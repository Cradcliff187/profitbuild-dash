import React, { useState } from "react";
import { Eye, Trash2, MoreHorizontal, ExternalLink } from "lucide-react";
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
import type { BranchBid } from "@/types/bid";

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
}: BidsTableViewProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; bid: BranchBid | null}>({
    open: false,
    bid: null
  });

  const columnDefinitions = [
    { key: "name", label: "Bid Name", required: true, sortable: true },
    { key: "client_name", label: "Client", required: false, sortable: true },
    { key: "created_at", label: "Created", required: false, sortable: true },
    { key: "project", label: "Linked Project", required: false, sortable: false },
    { key: "created_by", label: "Created By", required: false, sortable: true },
    { key: "actions", label: "Actions", required: true },
  ];

  const widths: Record<string, string> = {
    name: "w-64",
    client_name: "w-48",
    created_at: "w-32",
    project: "w-40",
    created_by: "w-40",
    actions: "w-20",
  };
  
  const alignments: Record<string, string> = {
    created_at: "text-right",
    actions: "text-right",
  };
  
  const labels: Record<string, string> = {
    name: "Bid Name",
    client_name: "Client",
    created_at: "Created",
    project: "Linked Project",
    created_by: "Created By",
    actions: "Actions",
  };

  const handleViewDetails = (bid: BranchBid) => {
    navigate(`/branch-bids/${bid.id}`);
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

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12">
            <div className="text-xs text-muted-foreground">Loading bids...</div>
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
            <p className="text-xs text-muted-foreground mb-2">No bids found</p>
            <p className="text-xs text-muted-foreground">
              Create your first bid to get started
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
          {bids.map((bid) => (
            <MobileListCard
              key={bid.id}
              title={bid.name}
              subtitle={(bid as BranchBid & { client_name?: string }).client_name || bid.clients?.client_name || 'No client'}
              badge={bid.project_id ? {
                label: 'LINKED',
                className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
              } : undefined}
              metrics={[
                {
                  label: 'Created',
                  value: format(new Date(bid.created_at), 'MMM dd, yyyy'),
                },
                {
                  label: 'Project',
                  value: bid.projects?.project_number || '—',
                },
              ]}
              onTap={() => handleViewDetails(bid)}
              actions={[
                {
                  icon: Eye,
                  label: 'View Details',
                  onClick: (e) => {
                    e.stopPropagation();
                    handleViewDetails(bid);
                  },
                },
                {
                  icon: Trash2,
                  label: 'Delete',
                  onClick: (e) => handleDeleteClick(bid, e),
                  variant: 'destructive' as const,
                },
              ]}
            />
          ))}
        </div>

        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, bid: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bid</AlertDialogTitle>
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
                              <div>
                                <div className="font-semibold">{bid.name}</div>
                                {bid.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {bid.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        case "client_name":
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {bid.clients ? (
                                <div>
                                  <div className="font-medium">{bid.clients.client_name}</div>
                                  {bid.clients.company_name && (
                                    <div className="text-xs text-muted-foreground">{bid.clients.company_name}</div>
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
                        case "project":
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              {bid.projects ? (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  <ExternalLink className="h-2.5 w-2.5 mr-1" />
                                  {bid.projects.project_number}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
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
                                    View Details
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
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, bid: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bid</AlertDialogTitle>
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
