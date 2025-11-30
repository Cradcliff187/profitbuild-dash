import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileBarChart } from "lucide-react";
import { NewTemplateGallery } from "@/components/reports/NewTemplateGallery";
import { SimpleReportBuilder } from "@/components/reports/SimpleReportBuilder";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ExportControls } from "@/components/reports/ExportControls";
import { FilterSummary } from "@/components/reports/FilterSummary";
import { SimpleFilterPanel } from "@/components/reports/SimpleFilterPanel";
import { useReportExecution, ReportConfig, ReportFilter } from "@/hooks/useReportExecution";
import { ReportTemplate, useReportTemplates } from "@/hooks/useReportTemplates";
import { ReportField } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { useIsMobile } from "@/hooks/use-mobile";
import { FieldMetadata, AVAILABLE_FIELDS } from "@/components/reports/SimpleReportBuilder";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ReportsSidebar, ReportCategory } from "@/components/reports/ReportsSidebar";

const ReportsPage = () => {
  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('standard');
  const [showBuilder, setShowBuilder] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportFields, setReportFields] = useState<ReportField[]>([]);
  const [reportName, setReportName] = useState('');
  const [currentConfig, setCurrentConfig] = useState<ReportConfig | null>(null);
  const [currentFilters, setCurrentFilters] = useState<ReportFilter[]>([]);
  const [currentDataSource, setCurrentDataSource] = useState<ReportConfig['data_source']>('projects');
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const { executeReport, isLoading } = useReportExecution();
  const { toast } = useToast();
  const { savedReports } = useReportTemplates();

  // Convert filters object to array for FilterSummary
  const handleCategoryChange = (category: ReportCategory) => {
    setSelectedCategory(category);
    // Clear current report view when navigating to a new category
    setHasResults(false);
    setShowBuilder(false);
    setSelectedTemplate(null);
    setReportData([]);
    setReportFields([]);
    setReportName('');
    setCurrentConfig(null);
    setCurrentFilters([]);
  };

  const filtersObjectToArray = (filters: Record<string, ReportFilter>): ReportFilter[] => {
    return Object.values(filters).filter(filter => filter && filter.field && filter.operator);
  };

  // Convert filters array back to object for ReportConfig
  const filtersArrayToObject = (filters: ReportFilter[]): Record<string, ReportFilter> => {
    const filterMap: Record<string, ReportFilter> = {};
    filters.forEach((filter, index) => {
      if (filter && filter.field && filter.operator) {
        filterMap[`filter_${index}`] = filter;
      }
    });
    return filterMap;
  };

  // Apply filters and refresh the report
  const handleApplyFilters = async () => {
    if (!currentConfig) return;

    const filterMap = filtersArrayToObject(currentFilters);
    
    const updatedConfig: ReportConfig = {
      ...currentConfig,
      filters: filterMap,
      sort_by: 'created_at', // Default sort, column sorting is now primary
      sort_dir: 'DESC'
    };

    setCurrentConfig(updatedConfig);

    const result = await executeReport(updatedConfig);

    if (result) {
      setReportData(result.data);
      setFiltersSheetOpen(false);
      toast({
        title: "Filters Applied",
        description: `Report updated with ${result.data.length} rows`
      });
    } else {
      toast({
        title: "Failed to apply filters",
        description: "Could not refresh the report",
        variant: "destructive"
      });
    }
  };

  const handleClearAllFilters = () => {
    setCurrentFilters([]);
    if (currentConfig) {
      const updatedConfig: ReportConfig = {
        ...currentConfig,
        filters: {}
      };
      executeReport(updatedConfig).then(result => {
        if (result) {
          setReportData(result.data);
        }
      });
    }
  };

  const handleUseTemplate = async (template: ReportTemplate) => {
    setSelectedTemplate(template);
    
    // Execute the template's config
    const templateConfig = template.config as any;
    
    // Remove status filters that limit to "in_progress" to show all projects by default
    const filters = { ...(templateConfig.filters || {}) };
    const filterKeys = Object.keys(filters);
    for (const key of filterKeys) {
      const filter = filters[key];
      if (filter?.field === 'status' && filter?.operator === 'equals' && filter?.value === 'in_progress') {
        delete filters[key];
      }
    }
    
    // Update report name if it's "Active Projects Dashboard" to a generic name
    let reportName = template.name;
    if (template.name === 'Active Projects Dashboard' || template.name.toLowerCase().includes('active projects')) {
      reportName = 'Projects Report';
    }
    setReportName(reportName);
    
    // Convert template config to ReportConfig format
    const config: ReportConfig = {
      data_source: templateConfig.data_source,
      filters: filters,
      sort_by: templateConfig.sort_by || 'created_at',
      sort_dir: templateConfig.sort_dir || 'DESC',
      limit: templateConfig.limit || 100
    };

    // Store current config and convert filters to array
    setCurrentConfig(config);
    setCurrentDataSource(config.data_source);
    setCurrentFilters(filtersObjectToArray(config.filters || {}));

    const result = await executeReport(config);

    if (result) {
      // Extract fields from template config
      let templateFields = templateConfig.fields || [];
      
      // Ensure project_number is included if project_name is present
      const hasProjectName = templateFields.some((f: any) => {
        const fieldKey = typeof f === 'string' ? f : (f.key || f.source_field || f.field || f);
        return fieldKey === 'project_name';
      });
      
      const hasProjectNumber = templateFields.some((f: any) => {
        const fieldKey = typeof f === 'string' ? f : (f.key || f.source_field || f.field || f);
        return fieldKey === 'project_number';
      });
      
      // If project_name exists but project_number doesn't, add project_number before project_name
      if (hasProjectName && !hasProjectNumber) {
        const projectNameIndex = templateFields.findIndex((f: any) => {
          const fieldKey = typeof f === 'string' ? f : (f.key || f.source_field || f.field || f);
          return fieldKey === 'project_name';
        });
        
        // Insert project_number before project_name
        templateFields = [
          ...templateFields.slice(0, projectNameIndex),
          'project_number',
          ...templateFields.slice(projectNameIndex)
        ];
      }
      
      // Ensure project_number always comes before project_name in the final field list
      let fields: ReportField[] = templateFields.map((f: any) => {
        // Handle both string field names and field objects
        if (typeof f === 'string') {
          // Find field metadata from AVAILABLE_FIELDS
          const fieldMetadata = AVAILABLE_FIELDS[config.data_source]?.find(
            field => field.key === f
          );
          return {
            key: f,
            label: fieldMetadata?.label || f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: fieldMetadata?.type || 'text'
          };
        }
        // Handle field objects
        return {
          key: f.key || f.source_field || f.field || f,
          label: f.label || f.display_name || f.field || f,
          type: f.type || 'text'
        };
      });

      // Ensure project_number always appears before project_name
      const projectNumberIndex = fields.findIndex(f => f.key === 'project_number');
      const projectNameIndex = fields.findIndex(f => f.key === 'project_name');
      
      if (projectNameIndex >= 0 && projectNumberIndex >= 0 && projectNumberIndex > projectNameIndex) {
        // Swap them so project_number comes first
        const projectNumberField = fields[projectNumberIndex];
        const projectNameField = fields[projectNameIndex];
        fields[projectNameIndex] = projectNumberField;
        fields[projectNumberIndex] = projectNameField;
      }

      setReportFields(fields);
      setReportData(result.data);
      setHasResults(true);
    } else {
      toast({
        title: "Failed to run template",
        description: "Could not execute the template report",
        variant: "destructive"
      });
    }
  };

  const handleRunReport = async (config: ReportConfig, fields: ReportField[]) => {
    // Store current config and convert filters to array
    setCurrentConfig(config);
    setCurrentDataSource(config.data_source);
    setCurrentFilters(filtersObjectToArray(config.filters || {}));

    const result = await executeReport(config);

    if (result) {
      setReportFields(fields);
      setReportData(result.data);
      setReportName(`Custom ${config.data_source} Report`);
      setHasResults(true);
      toast({
        title: "Report Generated",
        description: `Found ${result.data.length} rows`
      });
    } else {
      toast({
        title: "Failed to generate report",
        description: "Could not execute the report",
        variant: "destructive"
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full no-horizontal-scroll pt-16">
        <ReportsSidebar 
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        <SidebarInset className="flex-1 flex flex-col no-horizontal-scroll overflow-hidden">
          {/* Compact Header */}
          <header className="sticky top-0 z-10 flex h-auto flex-col gap-3 border-b bg-background px-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center space-x-2">
                <FileBarChart className="h-5 w-5 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Reports & Analytics</h1>
                </div>
              </div>
            </div>
          </header>
          
          <div className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 space-y-4">

            {hasResults ? (
              <div className="space-y-4">
                <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{reportName}</CardTitle>
                  <CardDescription>
                    {reportData.length} rows • {reportFields.length} columns
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setHasResults(false);
                    setShowBuilder(false);
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Back to Reports
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setHasResults(false);
                    setShowBuilder(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <BrandedLoader message="Loading report data..." />
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setFiltersSheetOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Filters</span>
                    {currentFilters.length > 0 && (
                      <Badge variant="default" className="ml-2">
                        {currentFilters.length}
                      </Badge>
                    )}
                  </Button>

                  <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
                    <SheetContent side="right" className="sm:max-w-lg w-full p-0 flex flex-col">
                      <SheetHeader className="px-6 pt-6 pb-4 border-b">
                        <SheetTitle>Filter Report</SheetTitle>
                        <SheetDescription>
                          Add or modify filters to narrow down the results
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="flex-1 px-6 py-4">
                        <SimpleFilterPanel
                          filters={currentFilters}
                          onFiltersChange={setCurrentFilters}
                          availableFields={AVAILABLE_FIELDS[currentDataSource] || []}
                          dataSource={currentDataSource}
                        />
                      </ScrollArea>
                      <SheetFooter className="px-6 py-4 border-t gap-2">
                        <Button variant="outline" onClick={handleClearAllFilters} disabled={currentFilters.length === 0}>
                          Clear All
                        </Button>
                        <Button onClick={handleApplyFilters} disabled={isLoading}>
                          Apply Filters
                        </Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>

                  {currentFilters.length > 0 && (
                    <FilterSummary
                      filters={currentFilters}
                      availableFields={AVAILABLE_FIELDS[currentDataSource] || []}
                      onRemoveFilter={(index) => {
                        setCurrentFilters(currentFilters.filter((_, i) => i !== index));
                        // Auto-apply after removal
                        setTimeout(() => {
                          const updatedFilters = currentFilters.filter((_, i) => i !== index);
                          const filterMap = filtersArrayToObject(updatedFilters);
                          if (currentConfig) {
                            const updatedConfig: ReportConfig = {
                              ...currentConfig,
                              filters: filterMap
                            };
                            executeReport(updatedConfig).then(result => {
                              if (result) {
                                setReportData(result.data);
                                setCurrentFilters(updatedFilters);
                              }
                            });
                          }
                        }, 100);
                      }}
                      onClearAll={() => {
                        setCurrentFilters([]);
                        if (currentConfig) {
                          const updatedConfig: ReportConfig = {
                            ...currentConfig,
                            filters: {}
                          };
                          executeReport(updatedConfig).then(result => {
                            if (result) {
                              setReportData(result.data);
                              setCurrentFilters([]);
                            }
                          });
                        }
                      }}
                    />
                  )}

                  <ExportControls
                    reportName={reportName}
                    data={reportData}
                    fields={reportFields}
                  />
                  <ReportViewer
                    data={reportData}
                    fields={reportFields}
                  />
                </>
              )}
                </CardContent>
              </Card>
              </div>
            ) : showBuilder ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Create Custom Report</CardTitle>
                      <CardDescription>
                        Build your own report step by step
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowBuilder(false)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Back to Templates
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <SimpleReportBuilder onRunReport={handleRunReport} />
                </CardContent>
              </Card>
            ) : (
              <NewTemplateGallery 
                onSelectTemplate={handleUseTemplate}
                onCustomBuilder={() => setShowBuilder(true)}
                selectedCategory={selectedCategory}
                savedReports={savedReports}
              />
            )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ReportsPage;

