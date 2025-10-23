import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Video } from 'lucide-react';
import { FieldProjectSelector } from '@/components/FieldProjectSelector';
import { ProjectMediaGallery } from '@/components/ProjectMediaGallery';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function FieldMedia() {
  const { id: routeProjectId } = useParams();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(routeProjectId);

  // Sync URL with selection
  useEffect(() => {
    if (routeProjectId && routeProjectId !== selectedProjectId) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeProjectId]);

  // Fetch selected project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-details', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, address')
        .eq('id', selectedProjectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate(`/field-media/${projectId}`, { replace: true });
  };

  return (
    <MobilePageWrapper>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Field Media</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture and view project photos and videos
          </p>
        </div>

        {/* Project Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleProjectSelect}
            />
          </CardContent>
        </Card>

        {/* Media Gallery or Empty State */}
        {selectedProjectId ? (
          isLoading ? (
            <LoadingSpinner variant="spinner" message="Loading project..." />
          ) : project ? (
            <>
              {/* Project Info */}
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{project.project_number}</p>
                      <p className="text-sm">{project.project_name}</p>
                      <p className="text-xs text-muted-foreground">{project.client_name}</p>
                      {project.address && (
                        <p className="text-xs text-muted-foreground mt-1">{project.address}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Media Gallery */}
              <ErrorBoundary>
                <ProjectMediaGallery
                  projectId={project.id}
                  projectName={project.project_name}
                  projectNumber={project.project_number}
                  clientName={project.client_name}
                  address={project.address}
                />
              </ErrorBoundary>

              {/* Floating Capture Buttons */}
              <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-40">
                <Button
                  size="lg"
                  className="rounded-full h-12 w-12 shadow-lg"
                  onClick={() => navigate(`/field-media/${selectedProjectId}/capture`)}
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full h-12 w-12 shadow-lg"
                  onClick={() => navigate(`/field-media/${selectedProjectId}/capture-video`)}
                >
                  <Video className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : null
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a project above to view and capture media
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobilePageWrapper>
  );
}
