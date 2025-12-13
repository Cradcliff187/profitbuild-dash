import React, { useState } from "react";
import { Edit, Eye, Trash2, MoreHorizontal, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; bid: BranchBid | null}>({
    open: false,
    bid: null
  });

  const toggleCard = (bidId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(bidId)) {
        next.delete(bidId);
      } else {
        next.add(bidId);
      }
      return next;
    });
  };

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
            <Card key={bid.id} className="hover:bg-muted/50 transition-colors">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{bid.name}</CardTitle>
                    {bid.clients && (
                      <p className="text-xs text-muted-foreground mt-0.5">{bid.clients.client_name}</p>
                    )}
                  </div>
                  {onSelectOne && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(bid.id)}
                        onCheckedChange={(checked) => onSelectOne(bid.id, checked as boolean)}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {/* Always visible row with key info and chevron */}
                <div className="flex items-center justify-between px-3 py-2 border-t">
                  <span className="text-sm font-medium">
                    {format(new Date(bid.created_at), 'MMM d, yyyy')} • {bid.profiles?.full_name || 'Unknown'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCard(bid.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                      expandedCards.has(bid.id) ? 'rotate-180' : ''
                    }`} />
                  </Button>
                </div>
                
                {/* Collapsible content */}
                <Collapsible open={expandedCards.has(bid.id)}>
                  <CollapsibleContent>
                    <div className="space-y-2 pt-2">
                      {bid.description && (
                        <div className="px-3">
                          <div className="text-xs text-muted-foreground mb-1">Description</div>
                          <div className="text-sm">{bid.description}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs px-3">
                        {bid.clients && (
                          <div>
                            <div className="text-muted-foreground">Client</div>
                            <div className="font-medium">{bid.clients.client_name}</div>
                            {bid.clients.company_name && (
                              <div className="text-muted-foreground text-[10px]">{bid.clients.company_name}</div>
                            )}
                          </div>
                        )}
                        {bid.projects && (
                          <div>
                            <div className="text-muted-foreground">Project</div>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mt-0.5">
                              <ExternalLink className="h-2.5 w-2.5 mr-1" />
                              {bid.projects.project_number}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end pt-2 border-t px-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7">
                              <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
                              Actions
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
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
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
