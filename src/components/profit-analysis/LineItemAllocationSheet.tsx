import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useProjectFinancialDetail } from './hooks/useProjectFinancialDetail';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';

interface Props {
  projectId: string;
  projectNumber: string;
  open: boolean;
  onClose: () => void;
}

export function LineItemAllocationSheet({ projectId, projectNumber, open, onClose }: Props) {
  const { data: detail, isLoading } = useProjectFinancialDetail(projectId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'allocated' | 'pending'>('all');
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const lineItems = detail?.allocationSummary?.lineItems || [];
  
  const filteredItems = lineItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'allocated') return item.hasAllocation;
    if (filter === 'pending') return !item.hasAllocation;
    return true;
  });
  
  // Group by category
  const groupedByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = {
        category: item.category,
        categoryLabel: item.categoryLabel,
        items: [],
        totalEstimated: 0,
        totalQuoted: 0,
        totalAllocated: 0,
      };
    }
    acc[item.category].items.push(item);
    acc[item.category].totalEstimated += item.estimatedCost;
    acc[item.category].totalQuoted += item.quotedCost || item.estimatedCost;
    acc[item.category].totalAllocated += item.allocatedAmount;
    return acc;
  }, {} as Record<string, any>);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'full':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Allocated</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'none':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'No date';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Line Item Allocations
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{projectNumber}</p>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Summary */}
          {detail?.allocationSummary && (
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="p-2 bg-muted/50 rounded">
                <p className="font-bold">{detail.allocationSummary.totalExternalLineItems}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <p className="font-bold text-green-600">{detail.allocationSummary.allocatedCount}</p>
                <p className="text-xs text-muted-foreground">Allocated</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded">
                <p className="font-bold text-yellow-600">{detail.allocationSummary.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          )}
          
          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({lineItems.length})</TabsTrigger>
              <TabsTrigger value="allocated">
                Allocated ({lineItems.filter(i => i.hasAllocation).length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({lineItems.filter(i => !i.hasAllocation).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Line Items by Category */}
          <div className="space-y-4">
            {Object.values(groupedByCategory).map((group: any) => (
              <div key={group.category} className="border rounded-lg">
                {/* Category Header */}
                <div className="flex items-center justify-between p-3 bg-muted/30">
                  <div>
                    <p className="font-medium">{group.categoryLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} line items
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{formatCurrency(group.totalAllocated)}</p>
                    <p className="text-xs text-muted-foreground">
                      of {formatCurrency(group.totalQuoted)} quoted
                    </p>
                  </div>
                </div>
                
                {/* Line Items */}
                <div className="divide-y">
                  {group.items.map((item: any) => {
                    const isExpanded = expandedItems.has(item.id);
                    
                    return (
                      <div key={item.id}>
                        {/* Line Item Row */}
                        <div 
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20"
                          onClick={() => toggleExpand(item.id)}
                        >
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {item.source === 'change_order' && (
                                <Badge variant="outline" className="text-[10px]">
                                  CO: {item.changeOrderNumber}
                                </Badge>
                              )}
                              {item.quotedBy && (
                                <span>Quoted by: {item.quotedBy}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm flex-shrink-0">
                            <p className="font-medium whitespace-nowrap">
                              {formatCurrency(item.allocatedAmount)} / {formatCurrency(item.quotedCost || item.estimatedCost)}
                            </p>
                            <div className="mt-1">
                              {getStatusBadge(item.allocationStatus)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded: Show Expenses */}
                        {isExpanded && (
                          <div className="px-10 pb-3 space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-b pb-1">
                              <div>Estimated: {formatCurrency(item.estimatedCost)}</div>
                              <div>Quoted: {formatCurrency(item.quotedCost)}</div>
                              <div>Allocated: {formatCurrency(item.allocatedAmount)}</div>
                            </div>
                            
                            {item.expenses.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Allocated Expenses:</p>
                                {item.expenses.map((exp: any) => (
                                  <div 
                                    key={exp.id}
                                    className="flex justify-between items-center text-xs p-2 bg-muted/30 rounded"
                                  >
                                    <div>
                                      <p className="font-medium">{exp.payee}</p>
                                      <p className="text-muted-foreground">
                                        {formatDate(exp.date)}
                                        {exp.isSplit && ' (Split)'}
                                      </p>
                                    </div>
                                    <p className="font-medium whitespace-nowrap">{formatCurrency(exp.amount)}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic p-2 bg-yellow-50 rounded">
                                No expenses allocated yet. Go to Expense Matching to allocate.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No line items match the current filter</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

