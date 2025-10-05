import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 audio data
function processBase64Chunks(base64String: string) {
  try {
    // Decode the ENTIRE base64 string at once
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    
    // Convert to Uint8Array
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    console.error('Base64 decoding error:', error);
    throw new Error('Invalid base64 audio data');
  }
}

// Transcribe with Gemini 2.5 Flash (primary method)
async function transcribeWithGemini(binaryAudio: Uint8Array, apiKey: string) {
  console.log('Transcribing with Gemini 2.5 Flash...');
  
  // Convert binary to base64 string
  const audioBase64 = btoa(String.fromCharCode(...binaryAudio));
  
  const requestBody = {
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcribe the following audio caption for a construction project photo. Provide only the transcription text without any additional commentary.'
          },
          {
            type: 'audio',
            audio: {
              data: audioBase64,
              format: 'webm'
            }
          }
        ]
      }
    ]
  };

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// Transcribe with Whisper (fallback method)
async function transcribeWithWhisper(binaryAudio: Uint8Array, apiKey: string) {
  console.log('Transcribing with Whisper (fallback)...');
  
  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('prompt', 'Transcribe the following audio caption for a construction project photo:');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
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
  return result.text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio transcription request...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    let transcribedText: string;
    
    try {
      // Try Gemini 2.5 Flash first (FREE during promotional period)
      transcribedText = await transcribeWithGemini(binaryAudio, LOVABLE_API_KEY);
      console.log('Gemini transcription successful');
    } catch (geminiError) {
      // Fallback to Whisper if Gemini fails
      console.warn('Gemini failed, falling back to Whisper:', geminiError);
      
      try {
        transcribedText = await transcribeWithWhisper(binaryAudio, LOVABLE_API_KEY);
        console.log('Whisper fallback successful');
      } catch (whisperError) {
        console.error('Both Gemini and Whisper failed:', whisperError);
        
        // Handle specific error codes from either service
        if (whisperError.message.includes('400')) {
          return new Response(
            JSON.stringify({ 
              error: 'Audio format not supported. Please try recording again.',
              code: 'INVALID_AUDIO'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        if (whisperError.message.includes('429')) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded. Please wait 30 seconds and try again.',
              code: 'RATE_LIMIT'
            }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        if (whisperError.message.includes('402')) {
          return new Response(
            JSON.stringify({ 
              error: 'AI transcription credits exhausted. Please contact support.',
              code: 'PAYMENT_REQUIRED'
            }),
            { 
              status: 402, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Both services failed
        return new Response(
          JSON.stringify({ 
            error: 'Transcription service temporarily unavailable. Please try again.',
            code: 'TRANSCRIPTION_FAILED'
          }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ text: transcribedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
