import { CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVarianceCalculation } from "@/hooks/useVarianceCalculation";

interface VarianceAnalysisProps {
  projectId: string;
}

export function VarianceAnalysis({ projectId }: VarianceAnalysisProps) {
  const { variances, loading, error, totals } = useVarianceCalculation(projectId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 1) return '';
    return variance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400';
  };

  const exportToCSV = () => {
    // Summary section
    const summaryHeaders = ['Category', 'Estimated', 'Quoted', 'Actual', 'Variance ($)', 'Variance (%)'];
    const summaryRows = variances.map(variance => [
      `"${CATEGORY_DISPLAY_MAP[variance.category]}"`,
      Number(variance.estimated).toFixed(2),
      Number(variance.quoted).toFixed(2),
      Number(variance.actual).toFixed(2),
      Number(variance.variance).toFixed(2),
      (variance.variancePercentage / 100).toFixed(4)
    ]);

    // Add totals row
    const totalsRow = [
      '"TOTAL"',
      Number(totals.estimated).toFixed(2),
      Number(totals.quoted).toFixed(2),
      Number(totals.actual).toFixed(2),
      Number(totals.variance).toFixed(2),
      (totals.estimated > 0 ? (totals.variance / totals.estimated).toFixed(4) : '0.0000')
    ];

    // Detailed section
    const detailHeaders = ['Category', 'Description', 'Estimated', 'Quoted', 'Actual', 'Variance ($)', 'Variance (%)'];
    const detailRows = variances.flatMap(variance =>
      variance.lineItems.map(item => [
        `"${CATEGORY_DISPLAY_MAP[variance.category]}"`,
        `"${item.description}"`,
        Number(item.estimated).toFixed(2),
        Number(item.quoted).toFixed(2),
        Number(item.actual).toFixed(2),
        Number(item.variance).toFixed(2),
        (item.variancePercentage / 100).toFixed(4)
      ])
    );

    // Combine sections with separators
    const csvContent = [
      '=== SUMMARY BY CATEGORY ===',
      summaryHeaders.join(','),
      ...summaryRows.map(row => row.join(',')),
      totalsRow.join(','),
      '',
      '=== DETAILED LINE ITEMS ===',
      detailHeaders.join(','),
      ...detailRows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `variance_analysis_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis</CardTitle>
          <CardDescription>Loading variance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Variance Analysis</CardTitle>
            <CardDescription>
              Compare estimated, quoted, and actual amounts by category. Expand categories to see line item details.
            </CardDescription>
          </div>
          {variances.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {variances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No data available for variance analysis
          </div>
        ) : (
          <>
            {/* Summary Table */}
            <div className="rounded-md border mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Quoted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance ($)</TableHead>
                    <TableHead className="text-right">Variance (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variances.map((variance) => (
                    <TableRow key={variance.category}>
                      <TableCell className="font-medium">
                        {CATEGORY_DISPLAY_MAP[variance.category]}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(variance.estimated)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(variance.quoted)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(variance.actual)}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", getVarianceColor(variance.variance))}>
                        {variance.variance >= 0 ? '+' : ''}{formatCurrency(variance.variance)}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", getVarianceColor(variance.variance))}>
                        {variance.variancePercentage >= 0 ? '+' : ''}{variance.variancePercentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.estimated)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.quoted)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.actual)}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", getVarianceColor(totals.variance))}>
                      {totals.variance >= 0 ? '+' : ''}{formatCurrency(totals.variance)}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", getVarianceColor(totals.variance))}>
                      {totals.estimated > 0 ? 
                        `${(totals.variance / totals.estimated * 100) >= 0 ? '+' : ''}${(totals.variance / totals.estimated * 100).toFixed(1)}%` : 
                        '0.0%'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Detailed Line Items by Category */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Line Item Details</h3>
              <Accordion type="multiple" className="w-full">
                {variances.map((variance) => (
                  <AccordionItem key={variance.category} value={variance.category}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between items-center w-full mr-4">
                        <span className="font-medium">
                          {CATEGORY_DISPLAY_MAP[variance.category]}
                        </span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {variance.lineItems.length} items
                          </span>
                          <span className={cn("font-medium", getVarianceColor(variance.variance))}>
                            {variance.variance >= 0 ? '+' : ''}{formatCurrency(variance.variance)}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Estimated</TableHead>
                              <TableHead className="text-right">Quoted</TableHead>
                              <TableHead className="text-right">Actual</TableHead>
                              <TableHead className="text-right">Variance ($)</TableHead>
                              <TableHead className="text-right">Variance (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variance.lineItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                  No line items found for this category
                                </TableCell>
                              </TableRow>
                            ) : (
                              variance.lineItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    {item.description}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.estimated)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.quoted)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.actual)}
                                  </TableCell>
                                  <TableCell className={cn("text-right", getVarianceColor(item.variance))}>
                                    {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                                  </TableCell>
                                  <TableCell className={cn("text-right", getVarianceColor(item.variance))}>
                                    {item.variancePercentage >= 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}