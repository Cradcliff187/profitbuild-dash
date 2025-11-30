import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useReportTemplates, ReportTemplate } from "@/hooks/useReportTemplates";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { Search, Plus } from "lucide-react";
import { CompactTemplateList } from "./CompactTemplateList";
import type { ReportCategory } from "./ReportsSidebar";

interface NewTemplateGalleryProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  onCustomBuilder?: () => void;
  selectedCategory?: ReportCategory;
  savedReports?: ReportTemplate[];
}

export function NewTemplateGallery({ onSelectTemplate, onCustomBuilder, selectedCategory = 'standard', savedReports = [] }: NewTemplateGalleryProps) {
  const { templates, isLoading } = useReportTemplates();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates by search
  const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) ?? false)
    );
  });

  if (isLoading) {
    return <BrandedLoader message="Loading templates..." />;
  }

  return (
    <div className="space-y-3">
      {/* Header with Search and Custom Builder */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type report name here"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {onCustomBuilder && (
          <Button onClick={onCustomBuilder} variant="outline" size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Custom Report
          </Button>
        )}
      </div>

      {/* Compact Template List */}
      <CompactTemplateList
        templates={filteredTemplates}
        savedReports={savedReports}
        onSelectTemplate={onSelectTemplate}
        onCustomBuilder={onCustomBuilder}
        selectedCategory={selectedCategory}
      />
    </div>
  );
}

