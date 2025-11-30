import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Users, Building2, Info, DollarSign, Clock } from "lucide-react";
import { ReportTemplate } from "@/hooks/useReportTemplates";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: ReportTemplate;
  onUse: (template: ReportTemplate) => void;
  variant?: 'default' | 'compact';
}

const categoryIcons = {
  financial: TrendingUp,
  operational: Building2,
  client: Users,
  vendor: Users,
  schedule: FileText,
  cost: DollarSign,
  labor: Clock,
  other: FileText
};

// Map old categories to new ones
const categoryMap: Record<string, keyof typeof categoryIcons> = {
  'financial': 'financial',
  'operational': 'operational',
  'client': 'other',
  'vendor': 'other',
  'schedule': 'operational'
};

const categoryColors = {
  financial: 'bg-blue-50 border-blue-200 text-blue-900',
  operational: 'bg-green-50 border-green-200 text-green-900',
  client: 'bg-purple-50 border-purple-200 text-purple-900',
  vendor: 'bg-orange-50 border-orange-200 text-orange-900',
  schedule: 'bg-gray-50 border-gray-200 text-gray-900',
  cost: 'bg-amber-50 border-amber-200 text-amber-900',
  labor: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  other: 'bg-gray-50 border-gray-200 text-gray-900'
};

export function TemplateCard({ template, onUse, variant = 'default' }: TemplateCardProps) {
  const mappedCategory = categoryMap[template.category] || 'other';
  const Icon = categoryIcons[mappedCategory] || FileText;
  const colorClass = categoryColors[mappedCategory] || categoryColors.financial;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 hover:bg-accent/50 rounded-md transition-colors cursor-pointer",
          colorClass
        )}
        onClick={() => onUse(template)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{template.name}</div>
          {template.description && (
            <div className="text-xs opacity-80 truncate">{template.description}</div>
          )}
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={(e) => {
            e.stopPropagation();
            onUse(template);
          }}
        >
          Use
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <Card className={`${colorClass} hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col h-full group`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icon className="h-5 w-5 shrink-0" />
                <CardTitle className="text-lg truncate">{template.name}</CardTitle>
              </div>
              {template.description && (
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </div>
                </TooltipTrigger>
              )}
            </div>
            {template.description && (
              <CardDescription className="text-sm mt-2 line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            <Button 
              onClick={() => onUse(template)}
              className="w-full group-hover:scale-[1.02] transition-transform"
              variant="default"
            >
              Use Template
            </Button>
          </CardContent>
        </Card>
        {template.description && (
          <TooltipContent side="top" className="max-w-sm">
            <p className="font-semibold mb-1">{template.name}</p>
            <p className="text-sm">{template.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

