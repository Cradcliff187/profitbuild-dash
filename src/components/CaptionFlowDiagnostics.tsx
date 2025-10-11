import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { checkAudioRecordingSupport } from '@/utils/browserCompatibility';
import { FileSearch } from 'lucide-react';

export function CaptionFlowDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  
  const runDiagnostics = async () => {
    const audioSupport = checkAudioRecordingSupport();
    
    const pwaInfo = {
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isSecure: window.isSecureContext,
      serviceWorkerRegistered: !!navigator.serviceWorker?.controller,
      serviceWorkerSupported: 'serviceWorker' in navigator,
    };

    let permissionState = 'unknown';
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionState = permission.state;
      } catch (e) {
        permissionState = 'not-supported';
      }
    }
    
    setDiagnostics({
      timestamp: new Date().toISOString(),
      audioSupport,
      microphonePermission: permissionState,
      pwaInfo,
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
      mediaDevices: {
        supported: !!navigator.mediaDevices,
        getUserMediaSupported: !!navigator.mediaDevices?.getUserMedia,
      },
    });
  };
  
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Caption Flow Diagnostics</h3>
        <FileSearch className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">
        Check audio recording and PWA compatibility
      </p>
      <Button onClick={runDiagnostics} size="sm" className="w-full">
        Run Diagnostics
      </Button>
      
      {diagnostics && (
        <div className="space-y-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Audio Recording:</span>
              <span className={diagnostics.audioSupport.supported ? 'text-green-600' : 'text-red-600'}>
                {diagnostics.audioSupport.supported ? '✓ Supported' : '✗ Not Supported'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Microphone Permission:</span>
              <span>{diagnostics.microphonePermission}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PWA Installed:</span>
              <span>{diagnostics.pwaInfo.isInstalled ? '✓ Yes' : '✗ No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Secure Context:</span>
              <span>{diagnostics.pwaInfo.isSecure ? '✓ HTTPS' : '✗ HTTP'}</span>
            </div>
          </div>
          
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View Full Report
            </summary>
            <pre className="mt-2 bg-muted p-3 rounded overflow-auto max-h-80 text-[10px]">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </Card>
  );
}
