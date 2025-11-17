import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Video, Image as ImageIcon, Clock, Grid } from 'lucide-react';
import { FieldProjectSelector } from '@/components/FieldProjectSelector';
import { ProjectMediaGallery } from '@/components/ProjectMediaGallery';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { ErrorBoundary } from '@/components/ui/error-boundary';

type MediaTab = 'all' | 'photos' | 'videos' | 'timeline';

const tabOptions = [
  { value: 'all' as const, label: 'All', icon: Grid },
  { value: 'photos' as const, label: 'Photos', icon: ImageIcon },
  { value: 'videos' as const, label: 'Videos', icon: Video },
  { value: 'timeline' as const, label: 'Timeline', icon: Clock },
];

export default function FieldMedia() {
  const { id: routeProjectId } = useParams();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(routeProjectId);
  const [activeTab, setActiveTab] = useState<MediaTab>('all');

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
            <BrandedLoader message="Loading project..." />
          ) : project ? (
            <>
              {/* Media Gallery with Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaTab)} className="space-y-4">
                {/* Mobile: Dropdown + Controls Below */}
                <div className="sm:hidden space-y-2">
                  <Select value={activeTab} onValueChange={(value) => setActiveTab(value as MediaTab)}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tabOptions.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <SelectItem key={tab.value} value={tab.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{tab.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {/* Mobile controls will be rendered inside TabsContent by ProjectMediaGallery */}
                </div>

                {/* Desktop: Tabs + Controls in same row */}
                <div className="hidden sm:flex items-center justify-between gap-4">
                  <TabsList className="inline-flex gap-2 rounded-full bg-muted/40 p-1 h-auto">
                    {tabOptions.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {/* Controls will be rendered by ProjectMediaGallery via a portal */}
                  <div id="field-media-controls" className="flex items-center" />
                </div>

                {tabOptions.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value} className="mt-0">
                    <ErrorBoundary>
                      <ProjectMediaGallery
                        projectId={project.id}
                        projectName={project.project_name}
                        projectNumber={project.project_number}
                        clientName={project.client_name}
                        address={project.address}
                        externalActiveTab={tab.value}
                        hideInternalTabs={true}
                      />
                    </ErrorBoundary>
                  </TabsContent>
                ))}
              </Tabs>

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
