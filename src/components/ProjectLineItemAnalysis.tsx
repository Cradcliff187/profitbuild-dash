import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  ChevronDown,
  ChevronRight 
} from "lucide-react";
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LineItemAnalysisData {
  category: string;
  description: string;
  estimateQuantity: number;
  estimateRate: number;
  estimateTotal: number;
  quoteQuantity?: number;
  quoteRate?: number;
  quoteTotal?: number;
  actualExpenses: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'over' | 'on_target';
}

interface CategorySummary {
  category: string;
  estimateTotal: number;
  quoteTotal: number;
  actualExpenses: number;
  variance: number;
  variancePercent: number;
  lineItems: LineItemAnalysisData[];
  isExpanded: boolean;
}

interface ProjectLineItemAnalysisProps {
  projectId: string;
  projectName: string;
}

export const ProjectLineItemAnalysis = ({ 
  projectId, 
  projectName 
}: ProjectLineItemAnalysisProps) => {
  const [categoryData, setCategoryData] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSummary, setTotalSummary] = useState({
    estimateTotal: 0,
    quoteTotal: 0,
    actualExpenses: 0,
    variance: 0,
    variancePercent: 0
  });

  useEffect(() => {
    loadAnalysisData();
  }, [projectId]);

  const loadAnalysisData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch estimate line items, quote line items, and expenses
      const [estimatesRes, quoteLineItemsRes, expensesRes] = await Promise.all([
        supabase
          .from('estimates')
          .select(`
            *,
            estimate_line_items (*)
          `)
          .eq('project_id', projectId)
          .eq('is_current_version', true),
        supabase
          .from('quotes')
          .select(`
            *,
            quote_line_items (*)
          `)
          .eq('project_id', projectId)
          .eq('status', 'accepted'),
        supabase
          .from('expenses')
          .select('*')
          .eq('project_id', projectId)
      ]);

      if (estimatesRes.error) throw estimatesRes.error;
      if (quoteLineItemsRes.error) throw quoteLineItemsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const currentEstimate = estimatesRes.data?.[0];
      const acceptedQuotes = quoteLineItemsRes.data || [];
      const expenses = expensesRes.data || [];

      if (!currentEstimate?.estimate_line_items) {
        setCategoryData([]);
        return;
      }

      // Group data by category
      const categoryMap = new Map<string, CategorySummary>();

      // Process estimate line items
      currentEstimate.estimate_line_items.forEach((item: any) => {
        const categoryKey = item.category;
        const categoryLabel = CATEGORY_DISPLAY_MAP[item.category as LineItemCategory] || item.category;
        
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            category: categoryLabel,
            estimateTotal: 0,
            quoteTotal: 0,
            actualExpenses: 0,
            variance: 0,
            variancePercent: 0,
            lineItems: [],
            isExpanded: false
          });
        }

        const categoryData = categoryMap.get(categoryKey)!;
        categoryData.estimateTotal += item.total || 0;

        // Find corresponding quote line items
        let quoteQuantity = 0;
        let quoteRate = 0;
        let quoteTotal = 0;

        acceptedQuotes.forEach(quote => {
          quote.quote_line_items?.forEach((quoteItem: any) => {
            if (quoteItem.category === item.category && 
                quoteItem.description.toLowerCase().includes(item.description.toLowerCase().substring(0, 10))) {
              quoteQuantity += quoteItem.quantity || 0;
              quoteRate = quoteItem.rate || 0;
              quoteTotal += quoteItem.total || 0;
            }
          });
        });

        categoryData.quoteTotal += quoteTotal;

        // Find corresponding expenses
        const relatedExpenses = expenses.filter(exp => 
          exp.category === categoryKey && 
          (exp.description?.toLowerCase().includes(item.description.toLowerCase().substring(0, 10)) || 
           item.description.toLowerCase().includes(exp.description?.toLowerCase().substring(0, 10) || ''))
        );

        const actualExpenses = relatedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        categoryData.actualExpenses += actualExpenses;

        // Calculate variance (actual vs estimate)
        const variance = actualExpenses - (item.total || 0);
        const variancePercent = (item.total || 0) > 0 ? (variance / (item.total || 0)) * 100 : 0;

        const lineItemData: LineItemAnalysisData = {
          category: categoryLabel,
          description: item.description,
          estimateQuantity: item.quantity || 0,
          estimateRate: item.rate || 0,
          estimateTotal: item.total || 0,
          quoteQuantity: quoteQuantity || undefined,
          quoteRate: quoteRate || undefined,
          quoteTotal: quoteTotal || undefined,
          actualExpenses,
          variance,
          variancePercent,
          status: Math.abs(variancePercent) <= 5 ? 'on_target' : 
                   variancePercent > 5 ? 'over' : 'under'
        };

        categoryData.lineItems.push(lineItemData);
      });

      // Calculate category-level variances
      const categories = Array.from(categoryMap.values()).map(cat => {
        const variance = cat.actualExpenses - cat.estimateTotal;
        const variancePercent = cat.estimateTotal > 0 ? (variance / cat.estimateTotal) * 100 : 0;
        
        return {
          ...cat,
          variance,
          variancePercent,
          isExpanded: false
        };
      });

      // Calculate totals
      const totals = categories.reduce((acc, cat) => {
        acc.estimateTotal += cat.estimateTotal;
        acc.quoteTotal += cat.quoteTotal;
        acc.actualExpenses += cat.actualExpenses;
        return acc;
      }, { estimateTotal: 0, quoteTotal: 0, actualExpenses: 0 });

      const totalVariance = totals.actualExpenses - totals.estimateTotal;
      const totalVariancePercent = totals.estimateTotal > 0 ? (totalVariance / totals.estimateTotal) * 100 : 0;

      setTotalSummary({
        ...totals,
        variance: totalVariance,
        variancePercent: totalVariancePercent
      });

      setCategoryData(categories);
    } catch (error) {
      console.error('Error loading analysis data:', error);
      toast.error("Failed to load line item analysis data.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getVarianceBadge = (variancePercent: number) => {
    if (Math.abs(variancePercent) <= 5) {
      return <Badge className="bg-green-100 text-green-800">On Target</Badge>;
    } else if (variancePercent > 5) {
      return <Badge className="bg-red-100 text-red-800">Over Budget</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800">Under Budget</Badge>;
    }
  };

  const toggleCategoryExpansion = (index: number) => {
    setCategoryData(prev => 
      prev.map((cat, i) => 
        i === index ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">Loading analysis data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Line Item Analysis</h2>
          <p className="text-muted-foreground">{projectName}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Estimated Cost</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSummary.estimateTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quoted Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSummary.quoteTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Actual Spent</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSummary.actualExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {totalSummary.variancePercent > 5 ? 
                <TrendingUp className="h-4 w-4 text-red-600" /> :
                <TrendingDown className="h-4 w-4 text-green-600" />
              }
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSummary.variance)}</p>
                <p className="text-xs">{totalSummary.variancePercent.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryData.map((category, index) => (
            <div key={category.category} className="space-y-2">
              <div 
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => toggleCategoryExpansion(index)}
              >
                <div className="flex items-center gap-3">
                  {category.isExpanded ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <div>
                    <h4 className="font-medium">{category.category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {category.lineItems.length} line items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{formatCurrency(category.estimateTotal)}</p>
                    <p className="text-xs text-muted-foreground">Estimated</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{formatCurrency(category.actualExpenses)}</p>
                    <p className="text-xs text-muted-foreground">Actual</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{formatCurrency(category.variance)}</p>
                    <p className="text-xs text-muted-foreground">{category.variancePercent.toFixed(1)}%</p>
                  </div>
                  <div>
                    {getVarianceBadge(category.variancePercent)}
                  </div>
                </div>
              </div>

              {category.isExpanded && (
                <div className="ml-6 space-y-2">
                  {category.lineItems.map((item, itemIndex) => (
                    <div key={itemIndex} className="grid grid-cols-12 gap-2 p-3 border rounded-lg text-sm">
                      <div className="col-span-4">
                        <p className="font-medium">{item.description}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <p>{item.estimateQuantity} @ {formatCurrency(item.estimateRate)}</p>
                        <p className="text-muted-foreground">{formatCurrency(item.estimateTotal)}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        {item.quoteQuantity !== undefined ? (
                          <>
                            <p>{item.quoteQuantity} @ {formatCurrency(item.quoteRate || 0)}</p>
                            <p className="text-muted-foreground">{formatCurrency(item.quoteTotal || 0)}</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">No quote</p>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <p className="font-medium">{formatCurrency(item.actualExpenses)}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className={`font-medium ${item.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(item.variance)}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.variancePercent.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};