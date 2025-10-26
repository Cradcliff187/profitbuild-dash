import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Lazy-load FFmpeg.wasm core (only fetched when needed)
 */
async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (isLoading) {
      throw new Error('FFmpeg is already loading');
    }

    isLoading = true;
    const ffmpeg = new FFmpeg();

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegInstance = ffmpeg;
      isLoading = false;
      return ffmpeg;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

interface ConversionResult {
  blob: Blob;
  mime: string;
}

/**
 * Convert iOS QuickTime MOV to M4A audio for Whisper transcription
 */
export async function convertMovToM4a(
  videoBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  console.log('🔄 Starting MOV → M4A conversion...');
  
  try {
    const ffmpeg = await loadFFmpeg();
    
    // Write input file
    const inputName = 'input.mov';
    const outputName = 'output.m4a';
    
    await ffmpeg.writeFile(inputName, await fetchFile(videoBlob));
    
    // Set up progress tracking
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    // Extract audio: Try stream copy first (fast), fallback to re-encode
    console.log('⚙️ Extracting audio track...');
    try {
      // Attempt fast stream copy
      await ffmpeg.exec([
        '-i', inputName,
        '-vn',              // No video
        '-acodec', 'copy',  // Copy audio stream (fast)
        '-y',               // Overwrite output
        outputName
      ]);
    } catch (copyError) {
      console.warn('Stream copy failed, re-encoding audio...', copyError);
      // Fallback: re-encode to AAC
      await ffmpeg.exec([
        '-i', inputName,
        '-vn',
        '-acodec', 'aac',
        '-b:a', '128k',
        '-y',
        outputName
      ]);
    }

    // Read output file
    const data = await ffmpeg.readFile(outputName);
    // Convert to proper Uint8Array for Blob
    const uint8Data = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array();
    const audioBlob = new Blob([uint8Data], { type: 'audio/mp4' });

    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    console.log('✅ Conversion complete:', {
      originalSize: videoBlob.size,
      convertedSize: audioBlob.size,
      mime: 'audio/mp4'
    });

    return {
      blob: audioBlob,
      mime: 'audio/mp4'
    };
  } catch (error) {
    console.error('❌ MOV conversion failed:', error);
    throw new Error('Failed to convert video for transcription');
  }
}
