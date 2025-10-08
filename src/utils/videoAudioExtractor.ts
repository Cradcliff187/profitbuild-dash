/**
 * Extract audio from video blob and convert to base64-encoded WAV format
 * for transcription via OpenAI Whisper API
 */

/**
 * Convert Float32Array PCM audio to 16-bit WAV format
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = 1; // Mono
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = audioBuffer.getChannelData(0);
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // Helper to write string
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Convert float samples to 16-bit PCM
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset + i * 2, int16, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

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
 * Extract audio track from video blob and convert to base64-encoded WAV
 * @param videoBlob - Video blob from recording
 * @returns Base64-encoded WAV audio data suitable for Whisper API
 */
export async function extractAudioFromVideo(videoBlob: Blob): Promise<string> {
  try {
    // Create audio context with Whisper's preferred sample rate
    const audioContext = new AudioContext({ sampleRate: 24000 });
    
    // Convert blob to array buffer
    const arrayBuffer = await videoBlob.arrayBuffer();
    
    // Decode video to extract audio track
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Resample to 24kHz mono if needed
    let processedBuffer = audioBuffer;
    if (audioBuffer.sampleRate !== 24000 || audioBuffer.numberOfChannels !== 1) {
      const offlineContext = new OfflineAudioContext(
        1, // mono
        audioBuffer.duration * 24000,
        24000
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);
      
      processedBuffer = await offlineContext.startRendering();
    }
    
    // Convert to WAV blob
    const wavBlob = audioBufferToWav(processedBuffer);
    
    // Convert to base64 for API transmission
    const base64Audio = await blobToBase64(wavBlob);
    
    // Close audio context to free resources
    await audioContext.close();
    
    return base64Audio;
    
  } catch (error) {
    console.error('Failed to extract audio from video:', error);
    throw new Error('Failed to extract audio from video. The video format may not be supported.');
  }
}
