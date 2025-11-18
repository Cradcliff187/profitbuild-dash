import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TemplateCard } from "./TemplateCard";
import { useReportTemplates, ReportTemplate } from "@/hooks/useReportTemplates";
import { BrandedLoader } from "@/components/ui/branded-loader";

interface TemplateGalleryProps {
  onSelectTemplate: (template: ReportTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const { templates, isLoading } = useReportTemplates();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const templatesByCategory = {
    financial: filteredTemplates.filter(t => t.category === 'financial'),
    operational: filteredTemplates.filter(t => t.category === 'operational'),
    client: filteredTemplates.filter(t => t.category === 'client'),
    vendor: filteredTemplates.filter(t => t.category === 'vendor'),
    schedule: filteredTemplates.filter(t => t.category === 'schedule')
  };

  if (isLoading) {
    return <BrandedLoader message="Loading templates..." />;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Category Tabs */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {(Object.keys(templatesByCategory) as Array<keyof typeof templatesByCategory>).map(category => (
          <TabsContent key={category} value={category} className="mt-4">
            {templatesByCategory[category].length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {category} templates found
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesByCategory[category].map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={onSelectTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

