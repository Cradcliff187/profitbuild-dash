import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, FolderOpen, BarChart3 } from "lucide-react";
import { TemplateGallery } from "@/components/reports/TemplateGallery";
import { SimpleReportBuilder } from "@/components/reports/SimpleReportBuilder";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ExportControls } from "@/components/reports/ExportControls";
import { useReportExecution, ReportConfig } from "@/hooks/useReportExecution";
import { ReportTemplate } from "@/hooks/useReportTemplates";
import { ReportField } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { useIsMobile } from "@/hooks/use-mobile";

const ReportsPage = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'templates' | 'builder'>('templates');
  const [hasResults, setHasResults] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportFields, setReportFields] = useState<ReportField[]>([]);
  const [reportName, setReportName] = useState('');
  const { executeReport, isLoading } = useReportExecution();
  const { toast } = useToast();

  const tabOptions = [
    { value: 'templates', label: 'Templates', icon: null },
    { value: 'builder', label: 'Custom Builder', icon: Plus },
  ];

  const handleTabChange = (value: string) => {
    if (value === 'templates' || value === 'builder') {
      setActiveTab(value);
    }
  };

  const handleUseTemplate = async (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setReportName(template.name);

    // Execute the template's config
    const templateConfig = template.config as any;
    
    // Convert template config to ReportConfig format
    const config: ReportConfig = {
      data_source: templateConfig.data_source,
      filters: templateConfig.filters || {},
      sort_by: templateConfig.sort_by || 'created_at',
      sort_dir: templateConfig.sort_dir || 'DESC',
      limit: templateConfig.limit || 100
    };

    const result = await executeReport(config);

    if (result) {
      // Extract fields from template config
      const fields: ReportField[] = templateConfig.fields?.map((f: any) => ({
        key: f.key || f.source_field || f.field,
        label: f.label || f.display_name || f.field,
        type: f.type || 'text'
      })) || [];

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
                  <Button variant="outline" onClick={() => setHasResults(false)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Back to Reports
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setHasResults(false);
                    setActiveTab('builder');
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
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
              <div className="sm:hidden">
                <Select value={activeTab} onValueChange={handleTabChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tabOptions.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <SelectItem key={tab.value} value={tab.value}>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{tab.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

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
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>
                  Choose from pre-built report templates to get started quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateGallery onSelectTemplate={handleUseTemplate} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="builder" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Custom Report</CardTitle>
                <CardDescription>
                  Build your own report step by step
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleReportBuilder onRunReport={handleRunReport} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ReportsPage;

