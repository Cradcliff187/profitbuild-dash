/**
 * Extract audio from video blob using HTML5 video + Web Audio API
 * Works with video containers (MP4, QuickTime, WebM) in PWA/browser environments
 */

/**
 * Convert blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get pure base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract audio from video using HTML5 video element and MediaRecorder
 * @param videoBlob - Video blob from recording
 * @returns Object with base64 audio and its MIME type
 */
export async function extractAudioFromVideo(videoBlob: Blob): Promise<{ audioBase64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🎵 Starting audio extraction from video', {
        videoSize: `${(videoBlob.size / 1024).toFixed(2)} KB`,
        videoType: videoBlob.type
      });
      
      // Create video element
      const video = document.createElement('video');
      video.muted = false; // Need unmuted for audio capture
      video.playsInline = true;
      video.volume = 1.0; // Ensure full volume
      
      // Create audio context
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Verify audio stream has tracks
      console.log('🎵 Audio stream tracks:', destination.stream.getAudioTracks().length);
      
      if (destination.stream.getAudioTracks().length === 0) {
        reject(new Error('No audio tracks found in video'));
        return;
      }
      
      // Determine best audio format for this browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';
      
      console.log('🎙️ Recording audio with format:', mimeType);
      
      // Create media recorder with timeslice for more reliable data capture
      const mediaRecorder = new MediaRecorder(destination.stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      const audioChunks: Blob[] = [];
      let hasReceivedData = false;
      
      // Add timeout to detect if no data is being captured
      let recordingTimeout: NodeJS.Timeout;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          hasReceivedData = true;
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log('▶️ MediaRecorder started');
        // Set timeout to check if we're receiving data
        recordingTimeout = setTimeout(() => {
          if (!hasReceivedData) {
            console.error('⚠️ No audio data received after 2 seconds');
            mediaRecorder.stop();
            reject(new Error('No audio data captured from video'));
          }
        }, 2000);
      };
      
      mediaRecorder.onstop = async () => {
        clearTimeout(recordingTimeout);
        console.log('⏹️ MediaRecorder stopped, chunks:', audioChunks.length);
        
        try {
          if (audioChunks.length === 0) {
            throw new Error('No audio data was captured during playback');
          }
          
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          console.log('✅ Audio captured:', {
            size: `${(audioBlob.size / 1024).toFixed(2)} KB`,
            chunks: audioChunks.length,
            type: audioBlob.type
          });
          
          if (audioBlob.size === 0) {
            throw new Error('Audio blob is empty');
          }
          
          const audioBase64 = await blobToBase64(audioBlob);
          
          // Clean up
          video.remove();
          audioContext.close();
          URL.revokeObjectURL(video.src);
          
          // Return base MIME type without codecs for API
          const baseMimeType = mimeType.split(';')[0];
          resolve({ audioBase64, mimeType: baseMimeType });
        } catch (error) {
          video.remove();
          audioContext.close();
          URL.revokeObjectURL(video.src);
          reject(error);
        }
      };
      
      mediaRecorder.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
        clearTimeout(recordingTimeout);
        reject(error);
      };
      
      video.onerror = (error) => {
        console.error('❌ Video element error:', error);
        clearTimeout(recordingTimeout);
        reject(new Error('Failed to load video'));
      };
      
      // Wait for video to be fully ready
      video.oncanplaythrough = () => {
        console.log('🎬 Video fully loaded, starting recording...');
        console.log('📹 Video details:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        // Start recording with timeslice for more frequent data events
        mediaRecorder.start(100); // Request data every 100ms
        video.play().catch(err => {
          console.error('Failed to play video:', err);
          reject(err);
        });
      };
      
      // Stop recording when video ends
      video.onended = () => {
        console.log('🏁 Video playback complete, stopping recording...');
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      };
      
      // Load video
      video.src = URL.createObjectURL(videoBlob);
      video.load();
      
    } catch (error) {
      console.error('❌ Failed to extract audio from video:', error);
      reject(new Error('Failed to extract audio from video. The video format may not be supported.'));
    }
  });
}
