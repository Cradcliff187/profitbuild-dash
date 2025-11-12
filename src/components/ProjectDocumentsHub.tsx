import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, ChevronLeft } from 'lucide-react';
import { ProjectMediaGallery } from './ProjectMediaGallery';
import { ProjectReceiptsView } from './ProjectReceiptsView';
import { ProjectQuotePDFsList } from './ProjectQuotePDFsList';
import { ProjectDocumentsTable } from './ProjectDocumentsTable';
import { DocumentUpload } from './DocumentUpload';
import { ProjectDocumentsTimeline } from './ProjectDocumentsTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocumentType } from '@/types/document';
import { useNavigate } from 'react-router-dom';

interface ProjectDocumentsHubProps {
  projectId: string;
  projectName: string;
  projectNumber: string;
  clientName: string;
}

export function ProjectDocumentsHub({
  projectId,
  projectName,
  projectNumber,
  clientName,
}: ProjectDocumentsHubProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState<DocumentType>('other');
  const navigate = useNavigate();

  const tabOptions = [
    { value: 'all', label: 'All' },
    { value: 'media', label: 'Photos & Videos' },
    { value: 'receipts', label: 'Receipts' },
    { value: 'quotes', label: 'Quote PDFs' },
    { value: 'drawings', label: 'Drawings' },
    { value: 'permits', label: 'Permits' },
    { value: 'licenses', label: 'Licenses' },
  ];

  const handleUploadClick = () => {
    // Set document type based on active tab
    const typeMap: Record<string, DocumentType> = {
      drawings: 'drawing',
      permits: 'permit',
      licenses: 'license',
    };
    setUploadDocumentType(typeMap[activeTab] || 'other');
    setUploadDialogOpen(true);
  };

  const showUploadButton = ['drawings', 'permits', 'licenses'].includes(activeTab);

  return (
    <div className="space-y-4 p-3 sm:p-4 documents-section">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="h-9 w-9 rounded-full sm:h-7 sm:w-7"
          >
            <ChevronLeft className="w-4 h-4 sm:w-3 sm:h-3" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-foreground sm:text-sm">Documents</h1>
            <span className="text-xs text-muted-foreground sm:hidden">
              {projectNumber} · {projectName}
            </span>
          </div>
        </div>
        {showUploadButton && (
          <Button 
            size="sm" 
            onClick={handleUploadClick} 
            className="hidden h-8 gap-1 px-3 sm:flex"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        )}
      </div>

      {showUploadButton && (
        <Button 
          onClick={handleUploadClick} 
          className="h-10 w-full gap-2 text-sm font-semibold sm:hidden"
        >
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
          <ProjectDocumentsTimeline projectId={projectId} />
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

        <TabsContent value="drawings" className="mt-3 sm:mt-4">
          <ProjectDocumentsTable 
            projectId={projectId} 
            documentType="drawing"
            onDocumentDeleted={() => {}}
          />
        </TabsContent>

        <TabsContent value="permits" className="mt-3 sm:mt-4">
          <ProjectDocumentsTable 
            projectId={projectId} 
            documentType="permit"
            onDocumentDeleted={() => {}}
          />
        </TabsContent>

        <TabsContent value="licenses" className="mt-3 sm:mt-4">
          <ProjectDocumentsTable 
            projectId={projectId} 
            documentType="license"
            onDocumentDeleted={() => {}}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <DocumentUpload
            projectId={projectId}
            documentType={uploadDocumentType}
            onUploadSuccess={() => {
              setUploadDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
