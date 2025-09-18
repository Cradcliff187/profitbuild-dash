import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { ExpenseCategory } from "@/types/expense";
import { VarianceBadge } from "@/components/ui/variance-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface VarianceAnalysisProps {
  projectId: string;
}

interface LineItemDetail {
  description: string;
  estimated: number;
  quoted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
}

interface CategoryVariance {
  category: LineItemCategory;
  estimated: number;
  quoted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  lineItems: LineItemDetail[];
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

      // Fetch current estimate line items with descriptions
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimate_line_items')
        .select(`
          category,
          description,
          total,
          estimates!inner(
            project_id,
            is_current_version
          )
        `)
        .eq('estimates.project_id', projectId)
        .eq('estimates.is_current_version', true);

      if (estimateError) throw estimateError;

      // Fetch accepted quote line items with descriptions
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote_line_items')
        .select(`
          category,
          description,
          total,
          quotes!inner(
            project_id,
            status
          )
        `)
        .eq('quotes.project_id', projectId)
        .eq('quotes.status', 'accepted');

      if (quoteError) throw quoteError;

      // Fetch actual expenses with descriptions
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, description, amount')
        .eq('project_id', projectId);

      if (expenseError) throw expenseError;

      // Process data to create category groups with line item details
      const categoryMap = new Map<LineItemCategory, {
        estimated: number;
        quoted: number;
        actual: number;
        lineItemsMap: Map<string, {
          estimated: number;
          quoted: number;
          actual: number;
        }>;
      }>();

      // Initialize categories
      const allCategories = new Set<LineItemCategory>();
      
      // Process estimates
      (estimateData || []).forEach(item => {
        const category = item.category as LineItemCategory;
        const description = item.description || 'Unnamed Item';
        const amount = Number(item.total) || 0;
        
        allCategories.add(category);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            estimated: 0,
            quoted: 0,
            actual: 0,
            lineItemsMap: new Map()
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.estimated += amount;
        
        if (!categoryData.lineItemsMap.has(description)) {
          categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
        }
        categoryData.lineItemsMap.get(description)!.estimated += amount;
      });

      // Process quotes
      (quoteData || []).forEach(item => {
        const category = item.category as LineItemCategory;
        const description = item.description || 'Unnamed Item';
        const amount = Number(item.total) || 0;
        
        allCategories.add(category);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            estimated: 0,
            quoted: 0,
            actual: 0,
            lineItemsMap: new Map()
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.quoted += amount;
        
        if (!categoryData.lineItemsMap.has(description)) {
          categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
        }
        categoryData.lineItemsMap.get(description)!.quoted += amount;
      });

      // Process expenses
      (expenseData || []).forEach(item => {
        const category = item.category as LineItemCategory;
        const description = item.description || 'Unnamed Item';
        const amount = Number(item.amount) || 0;
        
        allCategories.add(category);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            estimated: 0,
            quoted: 0,
            actual: 0,
            lineItemsMap: new Map()
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.actual += amount;
        
        if (!categoryData.lineItemsMap.has(description)) {
          categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
        }
        categoryData.lineItemsMap.get(description)!.actual += amount;
      });

      // Convert to CategoryVariance array
      const categoryVariances: CategoryVariance[] = Array.from(allCategories).map(category => {
        const categoryData = categoryMap.get(category) || {
          estimated: 0,
          quoted: 0,
          actual: 0,
          lineItemsMap: new Map()
        };

        const estimated = categoryData.estimated;
        const quoted = categoryData.quoted;
        const actual = categoryData.actual;
        const variance = actual - estimated;
        const variancePercentage = estimated > 0 ? (variance / estimated) * 100 : 0;

        // Create line items array
        const lineItems: LineItemDetail[] = Array.from(categoryData.lineItemsMap.entries()).map(([description, amounts]) => {
          const lineVariance = amounts.actual - amounts.estimated;
          const lineVariancePercentage = amounts.estimated > 0 ? (lineVariance / amounts.estimated) * 100 : 0;
          
          return {
            description,
            estimated: amounts.estimated,
            quoted: amounts.quoted,
            actual: amounts.actual,
            variance: lineVariance,
            variancePercentage: lineVariancePercentage
          };
        }).filter(item => item.estimated > 0 || item.quoted > 0 || item.actual > 0);

        return {
          category,
          estimated,
          quoted,
          actual,
          variance,
          variancePercentage,
          lineItems
        };
      }).filter(item => item.estimated > 0 || item.quoted > 0 || item.actual > 0);

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
        variance: totals.variance + variance.variance,
      }),
      { estimated: 0, quoted: 0, actual: 0, variance: 0 }
    );
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 1) return '';
    return variance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400';
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
        <CardTitle>Variance Analysis</CardTitle>
        <CardDescription>
          Compare estimated, quoted, and actual amounts by category. Expand categories to see line item details.
        </CardDescription>
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