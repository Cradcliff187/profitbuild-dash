import { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "./TemplateCard";
import { useReportTemplates, ReportTemplate } from "@/hooks/useReportTemplates";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { Search, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface NewTemplateGalleryProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  onCustomBuilder?: () => void;
}

// Define new category structure
const CATEGORY_CONFIG = {
  financial: {
    label: "Financial Performance",
    description: "P&L, margins, budgets, and cost variance reports",
    icon: "💰"
  },
  operational: {
    label: "Project Management",
    description: "Dashboards, status tracking, and project oversight",
    icon: "📊"
  },
  cost: {
    label: "Cost Analysis",
    description: "Expenses, quotes, and change order tracking",
    icon: "💸"
  },
  labor: {
    label: "Time & Labor",
    description: "Time tracking and labor cost analysis",
    icon: "⏰"
  },
  other: {
    label: "Client & Vendor",
    description: "Relationship and performance reports",
    icon: "🤝"
  }
};

// Map old categories to new ones
const categoryMap: Record<string, keyof typeof CATEGORY_CONFIG> = {
  'financial': 'financial',
  'operational': 'operational',
  'client': 'other',
  'vendor': 'other',
  'schedule': 'operational'
};

export function NewTemplateGallery({ onSelectTemplate, onCustomBuilder }: NewTemplateGalleryProps) {
  const { templates, isLoading } = useReportTemplates();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    
    const query = searchQuery.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) ?? false)
    );
  }, [templates, searchQuery]);

  // Group templates by new category structure
  const templatesByCategory = useMemo(() => {
    const grouped: Record<keyof typeof CATEGORY_CONFIG, ReportTemplate[]> = {
      financial: [],
      operational: [],
      cost: [],
      labor: [],
      other: []
    };

    filteredTemplates.forEach(template => {
      const mappedCategory = categoryMap[template.category] || 'other';
      grouped[mappedCategory].push(template);
    });

    return grouped;
  }, [filteredTemplates]);

  // Get categories that have templates
  const categoriesWithTemplates = useMemo(() => {
    return (Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).filter(
      category => templatesByCategory[category].length > 0
    );
  }, [templatesByCategory]);

  if (isLoading) {
    return <BrandedLoader message="Loading templates..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Custom Builder */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search report templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {onCustomBuilder && (
          <Button onClick={onCustomBuilder} variant="outline" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Custom Report
          </Button>
        )}
      </div>

      {/* Templates by Category */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No templates found</p>
          {searchQuery && (
            <p className="text-sm mt-2">
              Try a different search term or{' '}
              <button 
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline"
              >
                clear your search
              </button>
            </p>
          )}
        </div>
      ) : (
        <>
          {categoriesWithTemplates.map((categoryKey, index) => {
            const category = CATEGORY_CONFIG[categoryKey];
            const categoryTemplates = templatesByCategory[categoryKey];
            
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={categoryKey} className="space-y-4">
                {index > 0 && <Separator className="my-6" />}
                
                {/* Category Header */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={category.label}>
                      {category.icon}
                    </span>
                    {category.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>

                {/* Template Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUse={onSelectTemplate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Help Text */}
      {!searchQuery && templates.length > 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <p>Need a specific report? Use the search bar or create a custom report.</p>
        </div>
      )}
    </div>
  );
}

