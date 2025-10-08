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
      console.log('🎵 Using playback-capture method for audio extraction');
      
      // Create video element
      const video = document.createElement('video');
      video.muted = true; // Prevent audio playback
      video.playsInline = true;
      
      // Create audio context
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Determine best audio format for this browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';
      
      console.log('🎙️ Recording audio with format:', mimeType);
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(destination.stream, { mimeType });
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          console.log('✅ Audio captured:', {
            size: `${(audioBlob.size / 1024).toFixed(2)} KB`,
            type: audioBlob.type
          });
          
          const audioBase64 = await blobToBase64(audioBlob);
          
          // Clean up
          video.remove();
          audioContext.close();
          URL.revokeObjectURL(video.src);
          
          // Return base MIME type without codecs for API
          const baseMimeType = mimeType.split(';')[0];
          resolve({ audioBase64, mimeType: baseMimeType });
        } catch (error) {
          reject(error);
        }
      };
      
      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        reject(error);
      };
      
      video.onerror = (error) => {
        console.error('Video element error:', error);
        reject(new Error('Failed to load video'));
      };
      
      // Start recording when video can play
      video.oncanplay = () => {
        console.log('🎬 Video ready, starting audio recording...');
        mediaRecorder.start();
        video.play();
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
      console.error('Failed to extract audio from video:', error);
      reject(new Error('Failed to extract audio from video. The video format may not be supported.'));
    }
  });
}
