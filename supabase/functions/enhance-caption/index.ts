import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  imageUrl: string;
  originalCaption: string;
  mode: 'technical' | 'client-friendly' | 'next-steps';
  includeImageAnalysis: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, originalCaption, mode, includeImageAnalysis }: RequestBody = await req.json();
    
    // Validate inputs
    if (!mode || !['technical', 'client-friendly', 'next-steps'].includes(mode)) {
      throw new Error('Invalid enhancement mode');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode, originalCaption);

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (includeImageAnalysis && imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Enhance this construction site photo caption:' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: originalCaption 
          ? `Enhance this caption: "${originalCaption}"`
          : 'Generate a professional caption for this construction photo.'
      });
    }

    console.log('[enhance-caption] Calling OpenAI GPT-5 with mode:', mode);

    // Call OpenAI GPT-5
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages,
        max_completion_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[enhance-caption] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted');
      }
      throw new Error(`AI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const enhancedCaption = data.choices[0].message.content.trim();

    // Validate output
    if (!enhancedCaption || enhancedCaption.length < 10) {
      throw new Error('AI returned invalid caption');
    }

    console.log('[enhance-caption] Success:', {
      mode,
      originalLength: originalCaption?.length || 0,
      enhancedLength: enhancedCaption.length
    });

    return new Response(
      JSON.stringify({ 
        enhancedCaption,
        mode,
        originalLength: originalCaption?.length || 0,
        enhancedLength: enhancedCaption.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enhance-caption] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: error instanceof Error && error.message.includes('Rate limit') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildSystemPrompt(mode: string, originalCaption: string): string {
  const basePrompt = `You are a construction documentation expert. Your task is to enhance construction site photo captions for professional documentation.

Original Caption: "${originalCaption || 'No caption provided'}"
Context: Construction site photography for project documentation
`;

  let modeInstructions = '';
  
  if (mode === 'technical') {
    modeInstructions = `Purpose: Internal technical documentation
Focus Areas:
- Specifications and technical details
- Materials and equipment identification
- Code compliance and inspection notes
- Installation methods and techniques
- Precise measurements when visible

Tone: Professional, precise, technical language for contractors and engineers`;

  } else if (mode === 'client-friendly') {
    modeInstructions = `Purpose: Client-facing progress reports
Focus Areas:
- Project progress and milestones achieved
- Work completed and quality highlights
- Next steps and upcoming work
- Timeline context (on schedule, ahead, etc.)
- Visual improvements and value delivered

Tone: Clear, positive, non-technical language that clients can understand`;

  } else if (mode === 'next-steps') {
    modeInstructions = `Purpose: Action planning and coordination
Focus Areas:
- What needs to happen next
- Dependencies and prerequisites
- Required resources (materials, equipment, trades)
- Potential issues or considerations
- Timeline for next actions

Tone: Action-oriented, specific, practical guidance for project coordination`;
  }

  return `${basePrompt}

${modeInstructions}

Requirements:
- ${originalCaption ? 'Expand and improve the original caption, keeping factual elements' : 'Generate a complete professional caption based on the image'}
- Use appropriate construction industry terminology
- Keep response under 200 words
- Format as a single cohesive paragraph
- DO NOT use markdown formatting
- DO NOT include meta-labels like "Enhanced Caption:" or section headers
- Return ONLY the enhanced caption text
- Be specific and concrete, avoid generic statements
- Maintain accuracy - don't invent details not visible in the image`;
}
