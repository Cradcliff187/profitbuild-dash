import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Users, Building2 } from "lucide-react";
import { ReportTemplate } from "@/hooks/useReportTemplates";

interface TemplateCardProps {
  template: ReportTemplate;
  onUse: (template: ReportTemplate) => void;
}

const categoryIcons = {
  financial: TrendingUp,
  operational: Building2,
  client: Users,
  vendor: Users,
  schedule: FileText
};

const categoryColors = {
  financial: 'bg-blue-50 border-blue-200 text-blue-900',
  operational: 'bg-green-50 border-green-200 text-green-900',
  client: 'bg-purple-50 border-purple-200 text-purple-900',
  vendor: 'bg-orange-50 border-orange-200 text-orange-900',
  schedule: 'bg-gray-50 border-gray-200 text-gray-900'
};

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  const Icon = categoryIcons[template.category] || FileText;
  const colorClass = categoryColors[template.category] || categoryColors.financial;

  return (
    <Card className={`${colorClass} hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-lg">{template.name}</CardTitle>
          </div>
        </div>
        {template.description && (
          <CardDescription className="text-sm mt-2">
            {template.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <Button 
          onClick={() => onUse(template)}
          className="w-full"
          variant="default"
        >
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}

