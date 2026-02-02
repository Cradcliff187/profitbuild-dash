import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { ProjectMediaGallery } from "./ProjectMediaGallery";
import { ProjectReceiptsView } from "./ProjectReceiptsView";
import { ProjectQuotePDFsList } from "./ProjectQuotePDFsList";
import { ContractsListView } from "@/components/contracts/ContractsListView";
import { ProjectDocumentsTable } from "./ProjectDocumentsTable";
import { DocumentUpload } from "./DocumentUpload";
import { ProjectDocumentsTimeline } from "./ProjectDocumentsTimeline";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentType } from "@/types/document";

interface ProjectDocumentsHubProps {
  projectId: string;
  projectName: string;
  projectNumber: string;
  clientName: string;
}

export function ProjectDocumentsHub({ projectId, projectName, projectNumber, clientName }: ProjectDocumentsHubProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState<DocumentType>("other");

  const tabOptions = [
    { value: "all", label: "All" },
    { value: "media", label: "Photos & Videos" },
    { value: "receipts", label: "Receipts" },
    { value: "quotes", label: "Quotes" },
    { value: "contracts", label: "Contracts" },
    { value: "drawings", label: "Drawings" },
    { value: "permits", label: "Permits" },
    { value: "licenses", label: "Licenses" },
  ];

  const handleUploadClick = () => {
    // Set document type based on active tab
    const typeMap: Record<string, DocumentType> = {
      drawings: "drawing",
      permits: "permit",
      licenses: "license",
    };
    setUploadDocumentType(typeMap[activeTab] || "other");
    setUploadDialogOpen(true);
  };

  const showUploadButton = ["drawings", "permits", "licenses"].includes(activeTab);

  return (
    <div className="space-y-4 p-3 sm:p-4 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-foreground sm:text-sm">Documents</h1>
        {showUploadButton && (
          <Button size="sm" onClick={handleUploadClick} className="hidden h-8 gap-1 px-3 sm:flex">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        )}
      </div>

      {showUploadButton && (
        <Button onClick={handleUploadClick} className="h-10 w-full gap-2 text-sm font-semibold sm:hidden">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      )}

      {/* Tabs */}
      <div className="sm:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
            <SelectValue placeholder="Select tab" />
          </SelectTrigger>
          <SelectContent>
            {tabOptions.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
          {tabOptions.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-3 sm:mt-4">
          <ProjectDocumentsTimeline projectId={projectId} projectNumber={projectNumber} />
        </TabsContent>

        <TabsContent value="media" className="mt-3 sm:mt-4">
          <ProjectMediaGallery
            projectId={projectId}
            projectName={projectName}
            projectNumber={projectNumber}
            clientName={clientName}
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-3 sm:mt-4">
          <ProjectReceiptsView projectId={projectId} />
        </TabsContent>

        <TabsContent value="quotes" className="mt-3 sm:mt-4">
          <ProjectQuotePDFsList projectId={projectId} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-3 sm:mt-4">
          <ContractsListView projectId={projectId} projectNumber={projectNumber} />
        </TabsContent>

        <TabsContent value="drawings" className="mt-3 sm:mt-4">
          <ProjectDocumentsTable projectId={projectId} documentType="drawing" projectNumber={projectNumber} onDocumentDeleted={() => {}} />
        </TabsContent>

        <TabsContent value="permits" className="mt-3 sm:mt-4">
          <ProjectDocumentsTable projectId={projectId} documentType="permit" projectNumber={projectNumber} onDocumentDeleted={() => {}} />
        </TabsContent>

        <TabsContent value="licenses" className="mt-3 sm:mt-4">
          <ProjectDocumentsTable projectId={projectId} documentType="license" projectNumber={projectNumber} onDocumentDeleted={() => {}} />
        </TabsContent>
      </Tabs>

      {/* Upload Sheet */}
      <Sheet open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full p-4 z-[80] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Upload Document</SheetTitle>
            <SheetDescription>
              Upload PDFs, drawings, permits, licenses, and other project documents.
            </SheetDescription>
          </SheetHeader>
          <DocumentUpload
            projectId={projectId}
            documentType={uploadDocumentType}
            onUploadSuccess={() => {
              setUploadDialogOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
