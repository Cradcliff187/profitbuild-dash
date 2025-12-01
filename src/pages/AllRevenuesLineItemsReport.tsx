import React, { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ExportControls } from "@/components/reports/ExportControls";
import { ReportField } from "@/utils/reportExporter";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

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
  const { toast } = useToast();

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
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8" />
            All Revenues Line Items Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete listing of all revenue/invoice transactions
          </p>
        </div>
        <ExportControls
          data={exportData}
          fields={reportFields}
          reportName="All Revenues Line Items"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary</CardTitle>
          <CardDescription>
            {revenues.length} invoice{revenues.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
    </div>
  );
};

export default AllRevenuesLineItemsReport;
