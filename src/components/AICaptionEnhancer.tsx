import { useState, useEffect } from 'react';
import { X, Check, Edit, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAICaptionEnhancement, EnhancementMode } from '@/hooks/useAICaptionEnhancement';

interface AICaptionEnhancerProps {
  imageUrl: string;
  originalCaption: string;
  onAccept: (enhancedCaption: string) => void;
  onCancel: () => void;
}

export function AICaptionEnhancer({
  imageUrl,
  originalCaption,
  onAccept,
  onCancel
}: AICaptionEnhancerProps) {
  const [mode, setMode] = useState<EnhancementMode>('client-friendly');
  const [enhancedText, setEnhancedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const { enhance, isEnhancing, error, reset } = useAICaptionEnhancement();

  const handleEnhance = async () => {
    const result = await enhance(imageUrl, originalCaption, {
      mode,
      includeImageAnalysis: true
    });
    
    if (result) {
      setEnhancedText(result.enhancedCaption);
      setIsEditing(false);
    }
  };

  // Auto-enhance on mount with default mode
  useEffect(() => {
    handleEnhance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate when mode changes
  useEffect(() => {
    if (enhancedText) {
      handleEnhance();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModeChange = (newMode: string) => {
    setMode(newMode as EnhancementMode);
    reset();
  };

  const handleUseEnhanced = () => {
    if (enhancedText.trim()) {
      onAccept(enhancedText.trim());
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleRegenerate = () => {
    reset();
    handleEnhance();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Selector */}
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="technical" className="text-xs">
            Technical
          </TabsTrigger>
          <TabsTrigger value="client-friendly" className="text-xs">
            Client-Friendly
          </TabsTrigger>
          <TabsTrigger value="next-steps" className="text-xs">
            Next Steps
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">
            {error}
            {(error.includes('Rate limit') || error.includes('Network')) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="ml-2 h-6"
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Original Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Original</span>
            <span className="text-xs text-muted-foreground">
              {originalCaption.length} chars
            </span>
          </div>
          <div className="rounded-md border border-input bg-muted/50 p-3 min-h-[120px]">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {originalCaption || 'No caption provided'}
            </p>
          </div>
        </div>

        {/* Enhanced Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Enhanced
            </span>
            {enhancedText && (
              <span className="text-xs text-muted-foreground">
                {enhancedText.length} chars
              </span>
            )}
          </div>
          <div className="rounded-md border border-input bg-accent/20 p-3 min-h-[120px]">
            {isEnhancing ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : isEditing ? (
              <Textarea
                value={enhancedText}
                onChange={(e) => setEnhancedText(e.target.value)}
                className="min-h-[100px] text-sm resize-none"
                placeholder="Edit enhanced caption..."
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {enhancedText || 'Generating enhanced caption...'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isEnhancing}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {!isEditing && enhancedText && !isEnhancing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </>
          )}
          
          <Button
            variant="default"
            size="sm"
            onClick={handleUseEnhanced}
            disabled={!enhancedText || isEnhancing}
          >
            <Check className="h-4 w-4 mr-1" />
            Use Enhanced
          </Button>
        </div>
      </div>
    </div>
  );
}
