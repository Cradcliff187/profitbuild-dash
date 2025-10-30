import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, ChevronLeft } from 'lucide-react';
import { ProjectMediaGallery } from './ProjectMediaGallery';
import { ProjectReceiptsView } from './ProjectReceiptsView';
import { ProjectQuotePDFsList } from './ProjectQuotePDFsList';
import { ProjectDocumentsTable } from './ProjectDocumentsTable';
import { DocumentUpload } from './DocumentUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Documents</h1>
            <p className="text-xs text-muted-foreground">
              {projectNumber} - {projectName}
            </p>
          </div>
        </div>
        {showUploadButton && (
          <Button size="sm" onClick={handleUploadClick} className="h-8 gap-1">
            <Upload className="w-3 h-3" />
            Upload
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
          <TabsTrigger value="media" className="text-xs h-7">Photos & Videos</TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs h-7">Receipts</TabsTrigger>
          <TabsTrigger value="quotes" className="text-xs h-7">Quotes</TabsTrigger>
          <TabsTrigger value="drawings" className="text-xs h-7">Drawings</TabsTrigger>
          <TabsTrigger value="permits" className="text-xs h-7">Permits</TabsTrigger>
          <TabsTrigger value="licenses" className="text-xs h-7">Licenses</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="text-sm text-muted-foreground text-center py-8">
            Combined timeline view coming soon
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <ProjectMediaGallery 
            projectId={projectId}
            projectName={projectName}
            projectNumber={projectNumber}
            clientName={clientName}
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <ProjectReceiptsView projectId={projectId} />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <ProjectQuotePDFsList projectId={projectId} />
        </TabsContent>

        <TabsContent value="drawings" className="mt-4">
          <ProjectDocumentsTable 
            projectId={projectId} 
            documentType="drawing"
            onDocumentDeleted={() => {}}
          />
        </TabsContent>

        <TabsContent value="permits" className="mt-4">
          <ProjectDocumentsTable 
            projectId={projectId} 
            documentType="permit"
            onDocumentDeleted={() => {}}
          />
        </TabsContent>

        <TabsContent value="licenses" className="mt-4">
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
