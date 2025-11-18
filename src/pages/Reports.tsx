import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { NewTemplateGallery } from "@/components/reports/NewTemplateGallery";
import { SimpleReportBuilder } from "@/components/reports/SimpleReportBuilder";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ExportControls } from "@/components/reports/ExportControls";
import { FilterSummary } from "@/components/reports/FilterSummary";
import { SimpleFilterPanel } from "@/components/reports/SimpleFilterPanel";
import { useReportExecution, ReportConfig, ReportFilter } from "@/hooks/useReportExecution";
import { ReportTemplate } from "@/hooks/useReportTemplates";
import { ReportField } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { useIsMobile } from "@/hooks/use-mobile";
import { FieldMetadata, AVAILABLE_FIELDS } from "@/components/reports/SimpleReportBuilder";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ReportsPage = () => {
  const isMobile = useIsMobile();
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

  // Convert filters object to array for FilterSummary
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
      const fields: ReportField[] = templateConfig.fields?.map((f: any) => {
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
      }) || [];

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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate custom reports from your project data</p>
        </div>
      </div>

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
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
            <CardDescription>
              Choose from pre-built report templates organized by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewTemplateGallery 
              onSelectTemplate={handleUseTemplate}
              onCustomBuilder={() => setShowBuilder(true)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;

