import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract base64 from data URL if present
function extractBase64(input: string): string {
  const dataUrlIndex = input.indexOf(',');
  return dataUrlIndex !== -1 ? input.slice(dataUrlIndex + 1) : input;
}

// Transcribe with OpenAI Whisper (specialized for speech-to-text)
async function transcribeWithWhisper(audioBase64: string, format: string, apiKey: string) {
  console.log('Transcribing with OpenAI Whisper...');
  console.log('Original format received:', format);
  
  // Accept both audio and video formats (Whisper extracts audio automatically)
  let normalizedFormat = format.toLowerCase();
  let ext = 'mp3';

  // Audio formats
  if (normalizedFormat.includes('wav')) {
    normalizedFormat = 'audio/wav';
    ext = 'wav';
    console.log('🎤 WAV audio detected');
  } else if (normalizedFormat.includes('m4a') || normalizedFormat.includes('audio/mp4')) {
    normalizedFormat = 'audio/mp4';
    ext = 'm4a';
    console.log('🎤 M4A/MP4 audio detected');
  } else if (normalizedFormat.includes('audio/webm') || normalizedFormat.includes('webm;codecs=opus')) {
    normalizedFormat = 'audio/webm';
    ext = 'webm';
    console.log('🎤 WebM audio detected');
  } else if (normalizedFormat.includes('audio/mpeg') || normalizedFormat.includes('mp3')) {
    normalizedFormat = 'audio/mpeg';
    ext = 'mp3';
    console.log('🎤 MP3 audio detected');
  } 
  // Video formats (Whisper extracts audio track automatically)
  else if (normalizedFormat.includes('video/quicktime') || normalizedFormat.includes('quicktime')) {
    normalizedFormat = 'audio/mp4';
    ext = 'm4a';
    console.log('🎥 QuickTime video detected (iOS) - Converting to M4A for Whisper');
  } else if (normalizedFormat.includes('video/webm')) {
    normalizedFormat = 'video/webm';
    ext = 'webm';
    console.log('🎥 WebM video detected (Android) - Whisper will extract audio');
  } else if (normalizedFormat.includes('video/mp4') || normalizedFormat.includes('mp4')) {
    normalizedFormat = 'video/mp4';
    ext = 'mp4';
    console.log('🎥 MP4 video detected - Whisper will extract audio');
  } else {
    console.error('❌ Unsupported format received:', format);
    throw new Error(`INVALID_FORMAT: Unsupported media format. Received: ${format}. Supported: WAV, M4A, WebM, MP3, MOV, MP4`);
  }

  console.log('Validated format for Whisper:', normalizedFormat);
  
  // Convert base64 to Uint8Array in chunks to prevent memory issues
  const processBase64Chunks = (base64String: string, chunkSize = 32768) => {
    const chunks: Uint8Array[] = [];
    let position = 0;
    
    while (position < base64String.length) {
      const chunk = base64String.slice(position, position + chunkSize);
      const binaryChunk = atob(chunk);
      const bytes = new Uint8Array(binaryChunk.length);
      
      for (let i = 0; i < binaryChunk.length; i++) {
        bytes[i] = binaryChunk.charCodeAt(i);
      }
      
      chunks.push(bytes);
      position += chunkSize;
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  };

  // Convert base64 to binary
  const binaryAudio = processBase64Chunks(audioBase64);
  
  // Create Blob with normalized MIME type and FormData
  const audioBlob = new Blob([binaryAudio], { type: normalizedFormat });
  const formData = new FormData();
  
  formData.append('file', audioBlob, `media.${ext}`);
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whisper API error:', response.status, errorText);
    throw new Error(`Whisper API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const transcription = result.text;
  
  // Validate transcription is not empty
  if (!transcription || transcription.trim().length === 0) {
    console.error('⚠️ Whisper returned empty transcription');
    console.error('Format sent:', normalizedFormat);
    console.error('File extension:', ext);
    console.error('Audio size:', Math.round(binaryAudio.length / 1024), 'KB');
    throw new Error('NO_SPEECH_DETECTED: Whisper could not detect any speech in the audio. The recording may be silent, too quiet, or contain no spoken words.');
  }
  
  console.log('✅ Transcribed text preview:', transcription.slice(0, 100) + (transcription.length > 100 ? '...' : ''));
  return transcription;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const hasAuth = !!req.headers.get('authorization');
    console.log('Incoming request to transcribe-audio. Auth header present:', hasAuth);
    const { audio, format = 'audio/wav' } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio transcription request...');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    // Check for required API key FIRST
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Transcription service not configured. Please contact support.',
          code: 'SERVICE_UNAVAILABLE'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract clean base64 (remove data URL prefix if present)
    const audioBase64 = extractBase64(audio);
    const audioSizeKB = Math.round(audioBase64.length * 0.75 / 1024);
    console.log(`📊 Audio/Video Details:`);
    console.log(`  - Size: ~${audioSizeKB}KB`);
    console.log(`  - Format received: ${format}`);
    console.log(`  - Platform detected: ${format.includes('quicktime') ? 'iOS' : format.includes('webm') ? 'Android/Chrome' : 'Desktop/Other'}`);
    
    // Validate audio size
    if (audioSizeKB < 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Audio data too short. Please record at least 1 second.',
          code: 'AUDIO_TOO_SHORT'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (audioSizeKB > 25000) {
      return new Response(
        JSON.stringify({ 
          error: 'Audio data too large. Maximum 25MB allowed.',
          code: 'AUDIO_TOO_LARGE'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Single try-catch for Whisper only
    let transcribedText: string;
    try {
      transcribedText = await transcribeWithWhisper(audioBase64, format, OPENAI_API_KEY);
      console.log('✅ Whisper transcription successful');
    } catch (whisperError) {
      console.error('❌ Whisper transcription failed:', whisperError);
      
      // Parse error and return specific user-facing message
      const errorMessage = whisperError instanceof Error ? whisperError.message : 'Unknown error';
      
      // Check for empty transcription error
      if (errorMessage.includes('NO_SPEECH_DETECTED')) {
        return new Response(
          JSON.stringify({ 
            error: 'No speech detected in the recording. Please ensure you speak clearly and try again.',
            code: 'NO_SPEECH_DETECTED'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check for invalid format
      if (errorMessage.toLowerCase().includes('400') || errorMessage.toLowerCase().includes('invalid')) {
        return new Response(
          JSON.stringify({ 
            error: 'Audio format not supported. Please try recording again.',
            code: 'INVALID_AUDIO',
            details: 'Supported formats: MP4, MOV, WAV, WEBM, M4A'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check for rate limiting
      if (errorMessage.toLowerCase().includes('429')) {
        return new Response(
          JSON.stringify({ 
            error: 'Too many requests. Please wait 30 seconds and try again.',
            code: 'RATE_LIMIT'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generic 5xx error
      return new Response(
        JSON.stringify({ 
          error: 'Transcription service temporarily unavailable. Please try again in a few moments.',
          code: 'TRANSCRIPTION_FAILED',
          details: errorMessage
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ text: transcribedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
