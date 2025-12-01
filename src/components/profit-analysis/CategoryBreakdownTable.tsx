import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import type { CategorySummary } from './hooks/useProjectFinancialDetail';

interface Props {
  categories: CategorySummary[];
  expensesByCategory: Record<string, number>;
}

export function CategoryBreakdownTable({ categories, expensesByCategory }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  // If no detailed categories, fall back to expenses_by_category JSONB
  if (categories.length === 0 && expensesByCategory) {
    const categoryEntries = Object.entries(expensesByCategory);
    const total = categoryEntries.reduce((sum, [_, amount]) => sum + (amount as number), 0);
    
    return (
      <div className="space-y-2">
        {categoryEntries.map(([category, amount]) => (
          <div key={category} className="flex justify-between text-sm py-2 border-b last:border-0">
            <span>{CATEGORY_DISPLAY_MAP[category as keyof typeof CATEGORY_DISPLAY_MAP] || category}</span>
            <div className="text-right">
              <span className="font-medium">{formatCurrency(amount as number)}</span>
              <span className="text-muted-foreground ml-2">
                ({((amount as number) / total * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold pt-2 border-t">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-5 gap-3 text-xs font-medium text-muted-foreground px-2 py-1">
        <div className="col-span-1">Category</div>
        <div className="text-right">Est.</div>
        <div className="text-right">Quoted</div>
        <div className="text-right">Actual</div>
        <div className="text-right">Var.</div>
      </div>
      
      {categories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.category);
        
        return (
          <div key={cat.category}>
            {/* Category Row */}
            <div 
              className="grid grid-cols-5 gap-3 text-sm py-2 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(cat.category)}
            >
              <div className="col-span-1 flex items-center gap-1 font-medium min-w-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="truncate">{cat.categoryLabel}</span>
              </div>
              <div className="text-right whitespace-nowrap">{formatCurrency(cat.estimatedCost, { showCents: false })}</div>
              <div className="text-right whitespace-nowrap">{formatCurrency(cat.quotedCost, { showCents: false })}</div>
              <div className="text-right whitespace-nowrap">{formatCurrency(cat.actualCost, { showCents: false })}</div>
              <div className={cn(
                "text-right font-medium whitespace-nowrap",
                cat.variance > 0 ? "text-red-600" : cat.variance < 0 ? "text-green-600" : ""
              )}>
                {cat.variance > 0 ? '+' : ''}{formatCurrency(cat.variance, { showCents: false })}
              </div>
            </div>
            
            {/* Expanded Line Items */}
            {isExpanded && cat.lineItems.length > 0 && (
              <div className="ml-6 border-l-2 border-muted pl-2 space-y-1">
                {cat.lineItems.map((item) => (
                  <div 
                    key={item.id}
                    className="grid grid-cols-5 gap-3 text-xs py-1.5 px-2 text-muted-foreground"
                  >
                    <div className="col-span-1 truncate min-w-0" title={item.description}>
                      {item.description}
                    </div>
                    <div className="text-right whitespace-nowrap">{formatCurrency(item.estimatedCost, { showCents: false })}</div>
                    <div className="text-right whitespace-nowrap">{formatCurrency(item.quotedCost, { showCents: false })}</div>
                    <div className="text-right whitespace-nowrap">{formatCurrency(item.actualCost, { showCents: false })}</div>
                    <div className={cn(
                      "text-right whitespace-nowrap",
                      item.variance > 0 ? "text-red-500" : item.variance < 0 ? "text-green-500" : ""
                    )}>
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance, { showCents: false })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Totals Row */}
      <div className="grid grid-cols-5 gap-3 text-sm font-semibold py-2 px-2 border-t mt-2">
        <div className="col-span-1">Total</div>
        <div className="text-right whitespace-nowrap">
          {formatCurrency(categories.reduce((s, c) => s + c.estimatedCost, 0), { showCents: false })}
        </div>
        <div className="text-right whitespace-nowrap">
          {formatCurrency(categories.reduce((s, c) => s + c.quotedCost, 0), { showCents: false })}
        </div>
        <div className="text-right whitespace-nowrap">
          {formatCurrency(categories.reduce((s, c) => s + c.actualCost, 0), { showCents: false })}
        </div>
        <div className={cn(
          "text-right whitespace-nowrap",
          categories.reduce((s, c) => s + c.variance, 0) > 0 ? "text-red-600" : "text-green-600"
        )}>
          {formatCurrency(categories.reduce((s, c) => s + c.variance, 0), { showCents: false })}
        </div>
      </div>
    </div>
  );
}

