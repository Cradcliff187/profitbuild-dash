import { useState, useMemo } from 'react';
import { Star, ChevronDown, ChevronRight, FileText, TrendingUp, Building2, DollarSign, Clock, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReportTemplate } from "@/hooks/useReportTemplates";
import { ReportActionsMenu } from "./ReportActionsMenu";
import { useReportFavorites } from "@/hooks/useReportFavorites";
import { cn } from "@/lib/utils";

interface CompactTemplateListProps {
  templates: ReportTemplate[];
  savedReports?: ReportTemplate[];
  onSelectTemplate: (template: ReportTemplate) => void;
  onCustomBuilder?: () => void;
  selectedCategory?: string;
}

// Map categories to icons
const categoryIcons = {
  financial: TrendingUp,
  operational: Building2,
  cost: DollarSign,
  labor: Clock,
  training: GraduationCap,
  other: FileText,
};

// Map old categories to new ones
const categoryMap: Record<string, keyof typeof categoryIcons> = {
  'financial': 'financial',
  'operational': 'operational',
  'client': 'other',
  'vendor': 'other',
  'schedule': 'operational',
  'Training': 'training'
};

// Map specific template names to categories (overrides category field)
const templateNameMap: Record<string, keyof typeof categoryIcons> = {
  // Cost Analysis templates
  'Expense Report by Category': 'cost',
  'Cost Variance Report': 'cost',
  'Budget vs Actual by Project': 'cost',
  'Change Order Impact Analysis': 'cost',
  // Time & Labor templates
  'Time Entries Summary': 'labor',
  'Internal Labor Costs': 'labor',
  'Internal Labor Hours Tracking': 'labor',
};

const CATEGORY_CONFIG = {
  financial: {
    label: "Financial Performance",
    description: "P&L, margins, budgets, and cost variance reports",
  },
  operational: {
    label: "Project Management",
    description: "Dashboards, status tracking, and project oversight",
  },
  cost: {
    label: "Cost Analysis",
    description: "Expenses, quotes, and change order tracking",
  },
  labor: {
    label: "Time & Labor",
    description: "Time tracking and labor cost analysis",
  },
  training: {
    label: "Training",
    description: "Training assignments, completions, and compliance reports",
  },
  other: {
    label: "Client & Vendor",
    description: "Relationship and performance reports",
  },
};

export function CompactTemplateList({ 
  templates, 
  savedReports = [],
  onSelectTemplate, 
  onCustomBuilder,
  selectedCategory 
}: CompactTemplateListProps) {
  const { isFavorite, toggleFavorite } = useReportFavorites();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['favorites']));

  // Helper function to get the mapped category for a template
  const getMappedCategory = (template: ReportTemplate): keyof typeof categoryIcons => {
    // First check if template name has a specific mapping
    if (templateNameMap[template.name]) {
      return templateNameMap[template.name];
    }
    // Then check category mapping
    return categoryMap[template.category] || 'other';
  };

  // Combine templates and saved reports for display
  const allReports = useMemo(() => {
    return [...templates, ...savedReports];
  }, [templates, savedReports]);

  // Filter templates by category if specified
  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return allReports;
    
    return allReports.filter(template => {
      // Standard: all templates (is_template = true)
      if (selectedCategory === 'standard') return template.is_template === true;
      // Custom: all non-templates (is_template = false)
      if (selectedCategory === 'custom') return template.is_template === false;
      // Default: show all if category doesn't match
      return true;
    });
  }, [allReports, selectedCategory]);

  // Get favorites
  const favoriteTemplates = useMemo(() => {
    return filteredTemplates.filter(t => isFavorite(t.id));
  }, [filteredTemplates, isFavorite]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<keyof typeof CATEGORY_CONFIG, ReportTemplate[]> = {
      financial: [],
      operational: [],
      cost: [],
      labor: [],
      training: [],
      other: []
    };

    filteredTemplates.forEach(template => {
      const mappedCategory = getMappedCategory(template);
      grouped[mappedCategory].push(template);
    });

    return grouped;
  }, [filteredTemplates]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const renderTemplateRow = (template: ReportTemplate) => {
    const favorite = isFavorite(template.id);
    const mappedCategory = getMappedCategory(template);
    const Icon = categoryIcons[mappedCategory] || FileText;

    return (
      <div
        key={template.id}
        data-template-row
        className="group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 hover:bg-accent/50 rounded-md transition-colors cursor-pointer min-w-0 max-w-full overflow-hidden"
        onClick={() => onSelectTemplate(template)}
      >
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden" style={{ maxWidth: '100%' }}>
          <div className="text-sm font-medium truncate text-left">{template.name}</div>
          {template.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 min-w-0 text-left" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>{template.description}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(template.id);
            }}
          >
            <Star className={cn(
              "h-4 w-4",
              favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )} />
          </Button>
          <ReportActionsMenu
            template={template}
            isFavorite={favorite}
            onToggleFavorite={() => toggleFavorite(template.id)}
            onUse={onSelectTemplate}
          />
        </div>
      </div>
    );
  };

  const renderSection = (key: string, label: string, templates: ReportTemplate[]) => {
    if (templates.length === 0) return null;
    
    const isExpanded = expandedSections.has(key);
    const Icon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleSection(key)}>
        <CollapsibleTrigger className="w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-2 hover:bg-accent/30 rounded-md transition-colors min-w-0 overflow-hidden max-w-full">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold truncate min-w-0 flex-1 overflow-hidden text-left">{label}</span>
            <span className="text-xs text-muted-foreground shrink-0 ml-2 flex-shrink-0">
              {templates.length}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="py-1 space-y-0.5">
            {templates.map(renderTemplateRow)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div 
      className="space-y-2 w-full max-w-full overflow-hidden"
    >
      {/* Favorites Section */}
      {favoriteTemplates.length > 0 && (
        <div className="mb-4">
          {renderSection('favorites', 'Favorites', favoriteTemplates)}
        </div>
      )}

      {/* Category Sections */}
      {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((categoryKey) => {
        const category = CATEGORY_CONFIG[categoryKey];
        const categoryTemplates = templatesByCategory[categoryKey];
        
        if (categoryTemplates.length === 0) return null;

        return (
          <div key={categoryKey} data-section>
            {renderSection(categoryKey, category.label, categoryTemplates)}
          </div>
        );
      })}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm font-medium">No templates found</p>
          {onCustomBuilder && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onCustomBuilder}
            >
              Create Custom Report
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

