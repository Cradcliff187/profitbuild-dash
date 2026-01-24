import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileBarChart, Receipt, DollarSign, BarChart3, FileEdit, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useNavigate } from "react-router-dom";
import { NewTemplateGallery } from "@/components/reports/NewTemplateGallery";
import { SimpleReportBuilder } from "@/components/reports/SimpleReportBuilder";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ExportControls } from "@/components/reports/ExportControls";
import { FilterSummary } from "@/components/reports/FilterSummary";
import { SimpleFilterPanel } from "@/components/reports/SimpleFilterPanel";
import { AIReportChat } from "@/components/reports/AIReportChat";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportCategory } from "@/types/reports";

const ReportsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('ai');
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
  const { templates, savedReports } = useReportTemplates();

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

  const tabOptions = [
    {
      value: 'ai',
      label: 'AI Assistant',
      icon: Sparkles,
      badgeCount: 0,
    },
    {
      value: 'standard',
      label: 'Standard',
      icon: BarChart3,
      badgeCount: templates.length,
    },
    {
      value: 'custom',
      label: 'Custom',
      icon: FileEdit,
      badgeCount: savedReports.length,
    },
  ];

  return (
    <MobilePageWrapper className="flex flex-col h-full w-full max-w-full overflow-x-hidden">
      <PageHeader
        icon={BarChart3}
        title="Reports"
        description="Generate and view business reports"
        actions={
          <Button size="sm" onClick={() => setShowBuilder(true)} className="hidden sm:flex">
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        }
      />

      <Tabs value={selectedCategory} onValueChange={(value) => handleCategoryChange(value as ReportCategory)}>
        <div className="mb-4 px-3 sm:px-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-auto">
            {/* Mobile Dropdown */}
            <div className="sm:hidden">
              <Select value={selectedCategory} onValueChange={(value) => handleCategoryChange(value as ReportCategory)}>
                <SelectTrigger className="h-10 w-full rounded-lg border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{tab.label}</span>
                          {tab.badgeCount > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">({tab.badgeCount})</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tabs */}
            <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{tab.label}</span>
                    {tab.badgeCount > 0 && (
                      <span className="ml-1 text-xs">({tab.badgeCount})</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>
      </Tabs>
      
      <div className="px-3 py-4 sm:p-4 space-y-4 w-full max-w-full overflow-x-hidden min-w-0" style={{ maxWidth: '100vw' }}>

            {selectedCategory === 'ai' ? (
              <AIReportChat />
            ) : hasResults ? (
              <div className="space-y-4">
                <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="px-3 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{reportName}</CardTitle>
                  <CardDescription>
                    {reportData.length} rows • {reportFields.length} columns
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => {
                    setHasResults(false);
                    setShowBuilder(false);
                  }} className="w-full sm:w-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    Back to Reports
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4 space-y-4">
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
                      <SheetHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
                        <SheetTitle>Filter Report</SheetTitle>
                        <SheetDescription>
                          Add or modify filters to narrow down the results
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="flex-1 px-3 sm:px-6 py-3 sm:py-4">
                        <SimpleFilterPanel
                          filters={currentFilters}
                          onFiltersChange={setCurrentFilters}
                          availableFields={AVAILABLE_FIELDS[currentDataSource] || []}
                          dataSource={currentDataSource}
                        />
                      </ScrollArea>
                      <SheetFooter className="px-3 sm:px-6 py-3 sm:py-4 border-t gap-2 flex-col sm:flex-row">
                        <Button variant="outline" onClick={handleClearAllFilters} disabled={currentFilters.length === 0} className="w-full sm:w-auto">
                          Clear All
                        </Button>
                        <Button onClick={handleApplyFilters} disabled={isLoading} className="w-full sm:w-auto">
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
              <Card className="w-full max-w-full overflow-hidden">
                <CardHeader className="px-3 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">Create Custom Report</CardTitle>
                      <CardDescription>
                        Build your own report step by step
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowBuilder(false)} className="flex-shrink-0">
                      <FileText className="h-4 w-4 mr-2" />
                      Back to Templates
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-4">
                  <SimpleReportBuilder onRunReport={handleRunReport} />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Quick Access Line Item Reports */}
                <Card className="w-full max-w-full overflow-hidden">
                  <CardHeader className="px-3 sm:px-6 py-4">
                    <CardTitle>Quick Access Reports</CardTitle>
                    <CardDescription>
                      Direct access to all expense and revenue line items
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-4">
                    <div 
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-full"
                      style={{ maxWidth: '100%', overflow: 'hidden' }}
                    >
                      <Button
                        variant="outline"
                        className="h-auto p-3 sm:p-4 flex flex-col items-start gap-2 w-full"
                        style={{ maxWidth: '100%', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'anywhere', overflow: 'hidden' }}
                        onClick={() => navigate('/reports/all-expenses-line-items')}
                      >
                        <div className="flex items-start gap-2 w-full min-w-0" style={{ maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                          <Receipt className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="font-semibold flex-1 min-w-0 text-left" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>All Expenses Line Items</span>
                        </div>
                        <span className="text-sm text-muted-foreground text-left w-full pl-7" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: 'calc(100% - 0px)', boxSizing: 'border-box' }}>
                          View complete listing of all expense transactions
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto p-3 sm:p-4 flex flex-col items-start gap-2 w-full"
                        style={{ maxWidth: '100%', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'anywhere', overflow: 'hidden' }}
                        onClick={() => navigate('/reports/all-revenues-line-items')}
                      >
                        <div className="flex items-start gap-2 w-full min-w-0" style={{ maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                          <DollarSign className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="font-semibold flex-1 min-w-0 text-left" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>All Revenues Line Items</span>
                        </div>
                        <span className="text-sm text-muted-foreground text-left w-full pl-7" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: 'calc(100% - 0px)', boxSizing: 'border-box' }}>
                          View complete listing of all revenue/invoice transactions
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <NewTemplateGallery 
                  onSelectTemplate={handleUseTemplate}
                  onCustomBuilder={() => setShowBuilder(true)}
                  selectedCategory={selectedCategory}
                  savedReports={savedReports}
                />
              </div>
            )}
      </div>

      {/* Floating AI Assistant Button - shows when not on AI tab */}
      {selectedCategory !== 'ai' && (
        <Button
          variant="default"
          onClick={() => handleCategoryChange('ai')}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Sparkles className="h-6 w-6 !text-white" />
        </Button>
      )}
    </MobilePageWrapper>
  );
};

export default ReportsPage;

