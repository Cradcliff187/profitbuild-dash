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

// Transcribe with Gemini 2.5 Flash (primary method)
async function transcribeWithGemini(audioBase64: string, apiKey: string) {
  console.log('Transcribing with Gemini 2.5 Flash...');
  
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

// Transcribe with Gemini 2.5 Flash Lite (fallback method)
async function transcribeWithGeminiLite(audioBase64: string, apiKey: string) {
  console.log('Transcribing with Gemini 2.5 Flash Lite (fallback)...');
  
  const requestBody = {
    model: 'google/gemini-2.5-flash-lite',
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
    console.error('Gemini Lite API error:', response.status, errorText);
    throw new Error(`Gemini Lite API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
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

    // Extract clean base64 (remove data URL prefix if present)
    const audioBase64 = extractBase64(audio);
    console.log(`Audio size: ~${Math.round(audioBase64.length * 0.75 / 1024)}KB`);
    
    let transcribedText: string;
    
    try {
      // Try Gemini 2.5 Flash first (FREE during promotional period)
      transcribedText = await transcribeWithGemini(audioBase64, LOVABLE_API_KEY);
      console.log('✅ Gemini Flash transcription successful');
    } catch (geminiError) {
      // Fallback to Gemini Flash Lite if Flash fails
      console.warn('Gemini Flash failed, falling back to Gemini Flash Lite:', geminiError);
      
      try {
        transcribedText = await transcribeWithGeminiLite(audioBase64, LOVABLE_API_KEY);
        console.log('✅ Gemini Flash Lite fallback successful');
      } catch (liteError) {
        console.error('Both Gemini models failed:', liteError);
        
        // Handle specific error codes
        const errorMessage = liteError.message.toLowerCase();
        
        if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
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
        
        if (errorMessage.includes('429')) {
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
        
        if (errorMessage.includes('402') || errorMessage.includes('payment')) {
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
        
        // Both models failed
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
