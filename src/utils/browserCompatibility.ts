export function checkAudioRecordingSupport() {
  const issues: string[] = [];
  
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
    recommendedBrowser: issues.length > 0 ? 'Chrome 89+ or Safari 14.5+' : null,
  };
}
