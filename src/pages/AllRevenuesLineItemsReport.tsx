import React, { useState, useEffect } from "react";
import { DollarSign, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ExportControls } from "@/components/reports/ExportControls";
import { ReportField } from "@/utils/reportExporter";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";

interface RevenueLineItem {
  id: string;
  invoice_date: string;
  invoice_number: string | null;
  project_number: string;
  project_name: string;
  client_name: string | null;
  description: string | null;
  amount: number;
  account_name: string | null;
  account_full_name: string | null;
  quickbooks_transaction_id: string | null;
}

const AllRevenuesLineItemsReport = () => {
  const [revenues, setRevenues] = useState<RevenueLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    try {
      setLoading(true);
      
      // Query revenues without joins (no FK relationship exists)
      const { data: revenuesData, error: revenuesError } = await supabase
        .from("project_revenues")
        .select(`
          id,
          invoice_date,
          invoice_number,
          amount,
          description,
          account_name,
          account_full_name,
          quickbooks_transaction_id,
          project_id,
          client_id,
          is_split
        `)
        .order('invoice_date', { ascending: false });

      if (revenuesError) throw revenuesError;

      // Get unique project IDs and client IDs
      const projectIds = [...new Set((revenuesData || []).map(r => r.project_id).filter(Boolean))];
      const clientIds = [...new Set((revenuesData || []).map(r => r.client_id).filter(Boolean))];

      // Fetch projects separately
      const projectsMap = new Map();
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, project_number, project_name, client_name")
          .in('id', projectIds);

        if (projectsError) throw projectsError;
        
        (projectsData || []).forEach(p => {
          projectsMap.set(p.id, p);
        });
      }

      // Fetch clients separately
      const clientsMap = new Map();
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, client_name")
          .in('id', clientIds);

        if (!clientsError && clientsData) {
          clientsData.forEach(c => {
            clientsMap.set(c.id, c.client_name);
          });
        }
      }

      // Transform and merge data
      const transformedRevenues: RevenueLineItem[] = (revenuesData || []).map((revenue: any) => {
        const project = projectsMap.get(revenue.project_id);
        
        return {
          id: revenue.id,
          invoice_date: revenue.invoice_date,
          invoice_number: revenue.invoice_number,
          project_number: project?.project_number || 'Unassigned',
          project_name: project?.project_name || 'Unassigned',
          client_name: clientsMap.get(revenue.client_id) || project?.client_name || null,
          description: revenue.description || null,
          amount: revenue.amount,
          account_name: revenue.account_name,
          account_full_name: revenue.account_full_name,
          quickbooks_transaction_id: revenue.quickbooks_transaction_id,
        };
      });

      setRevenues(transformedRevenues);
    } catch (error: any) {
      console.error("Error loading revenues:", error);
      toast({
        title: "Error",
        description: "Failed to load revenues: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reportFields: ReportField[] = [
    { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
    { key: 'invoice_number', label: 'Invoice #', type: 'text' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
    { key: 'client_name', label: 'Client', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'account_full_name', label: 'Account', type: 'text' },
    { key: 'quickbooks_transaction_id', label: 'QuickBooks ID', type: 'text' },
  ];

  const exportData = revenues.map(rev => ({
    invoice_date: rev.invoice_date,
    invoice_number: rev.invoice_number || '',
    project_number: rev.project_number,
    project_name: rev.project_name,
    client_name: rev.client_name || '',
    description: rev.description || '',
    amount: rev.amount,
    account_full_name: rev.account_full_name || rev.account_name || '',
    quickbooks_transaction_id: rev.quickbooks_transaction_id || '',
  }));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <BrandedLoader message="Loading revenues..." />
      </div>
    );
  }

  const totalAmount = revenues.reduce((sum, rev) => sum + rev.amount, 0);

  return (
    <MobilePageWrapper className="w-full max-w-full overflow-x-hidden">
      <div className="px-3 py-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/reports">Reports</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>All Revenues Line Items</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="truncate">All Revenues Line Items Report</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete listing of all revenue/invoice transactions
          </p>
        </div>
          <div className="flex-shrink-0">
        <ExportControls
          data={exportData}
          fields={reportFields}
          reportName="All Revenues Line Items"
        />
          </div>
      </div>

        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-4">
          <CardTitle>Revenue Summary</CardTitle>
          <CardDescription>
            {revenues.length} invoice{revenues.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

        {/* Mobile Card View */}
        {isMobile ? (
          <div className="space-y-3 w-full max-w-full">
            {revenues.length === 0 ? (
              <Card className="w-full">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No revenues found</p>
                </CardContent>
              </Card>
            ) : (
              revenues.map((revenue) => {
                const isExpanded = expandedCards.has(revenue.id);
                const hasDetails = revenue.client_name || revenue.description || revenue.account_full_name || revenue.quickbooks_transaction_id;

                return (
                  <Card key={revenue.id} className="w-full max-w-full overflow-hidden hover:bg-muted/50 transition-colors">
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {revenue.invoice_number && (
                            <span className="font-mono text-sm font-semibold truncate">{revenue.invoice_number}</span>
                          )}
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {format(new Date(revenue.invoice_date), 'MMM dd, yyyy')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {/* Hero: Amount */}
                      <div className="text-center py-3 border-t">
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency(revenue.amount, { showCents: true })}
                        </div>
                      </div>

                      {/* Always Visible: Project Info */}
                      <div className="space-y-1 border-t pt-3">
                        <div className="font-mono text-sm font-medium">{revenue.project_number}</div>
                        <div className="text-sm text-muted-foreground truncate">{revenue.project_name}</div>
                      </div>

                      {/* Expandable Details */}
                      {hasDetails && (
                        <>
                          <div className="flex justify-center pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCard(revenue.id)}
                              className="h-8"
                            >
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded ? 'rotate-180' : ''
                              )} />
                              <span className="ml-1 text-xs">View Details</span>
                            </Button>
                          </div>
                          <Collapsible open={isExpanded}>
                            <CollapsibleContent>
                              <div className="space-y-2 pt-2 border-t">
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                  {revenue.client_name && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Client</div>
                                      <div className="font-medium truncate">{revenue.client_name}</div>
                                    </div>
                                  )}
                                  {revenue.description && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Description</div>
                                      <div className="text-sm break-words">{revenue.description}</div>
                                    </div>
                                  )}
                                  {(revenue.account_full_name || revenue.account_name) && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Account</div>
                                      <div className="text-sm truncate">{revenue.account_full_name || revenue.account_name}</div>
                                    </div>
                                  )}
                                  {revenue.quickbooks_transaction_id && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">QuickBooks ID</div>
                                      <div className="font-mono text-xs truncate">{revenue.quickbooks_transaction_id}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="px-3 sm:px-6 py-4">
          <CardTitle>Revenue Line Items</CardTitle>
        </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Project #</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>QuickBooks ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No revenues found
                    </TableCell>
                  </TableRow>
                ) : (
                  revenues.map((revenue) => (
                    <TableRow key={revenue.id}>
                      <TableCell>{format(new Date(revenue.invoice_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {revenue.invoice_number || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{revenue.project_number}</TableCell>
                      <TableCell>{revenue.project_name}</TableCell>
                      <TableCell>{revenue.client_name || '-'}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {revenue.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(revenue.amount, { showCents: true })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {revenue.account_full_name || revenue.account_name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {revenue.quickbooks_transaction_id || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        )}
    </div>
    </MobilePageWrapper>
  );
};

export default AllRevenuesLineItemsReport;
