import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { ExpenseCategory } from "@/types/expense";
import { VarianceBadge } from "@/components/ui/variance-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VarianceAnalysisProps {
  projectId: string;
}

interface CategoryVariance {
  category: LineItemCategory;
  estimated: number;
  quoted: number;
  actual: number;
  estimateVsQuoteVariance: number;
  estimateVsQuotePercentage: number;
  quoteVsActualVariance: number;
  quoteVsActualPercentage: number;
  estimateVsActualVariance: number;
  estimateVsActualPercentage: number;
}

export function VarianceAnalysis({ projectId }: VarianceAnalysisProps) {
  const [variances, setVariances] = useState<CategoryVariance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchVarianceData();
    }
  }, [projectId]);

  const fetchVarianceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current estimate line items
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimate_line_items')
        .select(`
          category,
          total,
          estimates!inner(
            project_id,
            is_current_version
          )
        `)
        .eq('estimates.project_id', projectId)
        .eq('estimates.is_current_version', true);

      if (estimateError) throw estimateError;

      // Fetch accepted quote line items
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote_line_items')
        .select(`
          category,
          total,
          quotes!inner(
            project_id,
            status
          )
        `)
        .eq('quotes.project_id', projectId)
        .eq('quotes.status', 'accepted');

      if (quoteError) throw quoteError;

      // Fetch actual expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('project_id', projectId);

      if (expenseError) throw expenseError;

      // Aggregate data by category
      const estimateTotals = aggregateByCategory(estimateData || [], 'total');
      const quoteTotals = aggregateByCategory(quoteData || [], 'total');
      const expenseTotals = aggregateByCategory(expenseData || [], 'amount');

      // Get all categories that appear in any dataset
      const allCategories = new Set([
        ...Object.keys(estimateTotals),
        ...Object.keys(quoteTotals),
        ...Object.keys(expenseTotals)
      ]) as Set<LineItemCategory>;

      // Calculate variances for each category
      const categoryVariances: CategoryVariance[] = Array.from(allCategories).map(category => {
        const estimated = estimateTotals[category] || 0;
        const quoted = quoteTotals[category] || 0;
        const actual = expenseTotals[category] || 0;

        return {
          category,
          estimated,
          quoted,
          actual,
          estimateVsQuoteVariance: quoted - estimated,
          estimateVsQuotePercentage: estimated > 0 ? ((quoted - estimated) / estimated) * 100 : 0,
          quoteVsActualVariance: actual - quoted,
          quoteVsActualPercentage: quoted > 0 ? ((actual - quoted) / quoted) * 100 : 0,
          estimateVsActualVariance: actual - estimated,
          estimateVsActualPercentage: estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0,
        };
      });

      // Sort by category display name
      categoryVariances.sort((a, b) => 
        CATEGORY_DISPLAY_MAP[a.category].localeCompare(CATEGORY_DISPLAY_MAP[b.category])
      );

      setVariances(categoryVariances);
    } catch (err) {
      console.error('Error fetching variance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load variance data');
    } finally {
      setLoading(false);
    }
  };

  const aggregateByCategory = (data: any[], amountField: string) => {
    return data.reduce((acc, item) => {
      const category = item.category as LineItemCategory;
      const amount = parseFloat(item[amountField]) || 0;
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<LineItemCategory, number>);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotals = () => {
    return variances.reduce(
      (totals, variance) => ({
        estimated: totals.estimated + variance.estimated,
        quoted: totals.quoted + variance.quoted,
        actual: totals.actual + variance.actual,
      }),
      { estimated: 0, quoted: 0, actual: 0 }
    );
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

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Three-Way Variance Analysis</CardTitle>
        <CardDescription>
          Compare estimated, quoted, and actual amounts by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Item Category</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Quoted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-center">Est vs Quote</TableHead>
                <TableHead className="text-center">Quote vs Actual</TableHead>
                <TableHead className="text-center">Est vs Actual</TableHead>
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
                  <TableCell className="text-center">
                    <VarianceBadge
                      variance={variance.estimateVsQuoteVariance}
                      percentage={variance.estimateVsQuotePercentage}
                      type="quote"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <VarianceBadge
                      variance={variance.quoteVsActualVariance}
                      percentage={variance.quoteVsActualPercentage}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <VarianceBadge
                      variance={variance.estimateVsActualVariance}
                      percentage={variance.estimateVsActualPercentage}
                      type="estimate"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {variances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No data available for variance analysis
                  </TableCell>
                </TableRow>
              )}
              {variances.length > 0 && (
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
                  <TableCell className="text-center">
                    <VarianceBadge
                      variance={totals.quoted - totals.estimated}
                      percentage={totals.estimated > 0 ? ((totals.quoted - totals.estimated) / totals.estimated) * 100 : 0}
                      type="quote"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <VarianceBadge
                      variance={totals.actual - totals.quoted}
                      percentage={totals.quoted > 0 ? ((totals.actual - totals.quoted) / totals.quoted) * 100 : 0}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <VarianceBadge
                      variance={totals.actual - totals.estimated}
                      percentage={totals.estimated > 0 ? ((totals.actual - totals.estimated) / totals.estimated) * 100 : 0}
                      type="estimate"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}