export function checkAudioRecordingSupport() {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check MediaRecorder API
  if (!window.MediaRecorder) {
    issues.push('MediaRecorder API not supported');
  }
  
  // Check getUserMedia
  if (!navigator.mediaDevices?.getUserMedia) {
    issues.push('getUserMedia not available');
  }
  
  // Check secure context
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    issues.push('Requires HTTPS connection');
  }
  
  // Check if in iframe
  if (window.self !== window.top) {
    warnings.push('Running in embedded view - microphone may be blocked');
  }
  
  // Check if iOS PWA
  const isIOS = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
  if (isIOS && isStandalone) {
    warnings.push('iOS PWA has limited microphone support - use Safari browser for best results');
  }
  
  // Check codec support
  const codecs = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/webm'
  ];
  
  const supportedCodec = codecs.find(codec => 
    window.MediaRecorder && MediaRecorder.isTypeSupported(codec)
  );
  
  if (!supportedCodec && window.MediaRecorder) {
    issues.push('No supported audio codec found');
  }
  
  return {
    supported: issues.length === 0,
    issues,
    warnings,
    recommendedAction: issues.length > 0 
      ? 'Use Chrome 89+ or Safari 14.5+' 
      : warnings.length > 0
      ? 'Open in new tab or Safari browser'
      : null,
    environment: {
      isIframe: window.self !== window.top,
      isIOSPWA: isIOS && isStandalone,
      isSecure: window.isSecureContext,
      hasMediaRecorder: !!window.MediaRecorder,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
    }
  };
}
