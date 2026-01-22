import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, laborBillingRate, laborActualRate } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build focused prompt - NO arithmetic, NO boundary decisions
    const systemPrompt = `You are a construction estimate classifier. You will receive line items that have ALREADY been extracted and split. Your ONLY job is to:
1. Classify each item's category
2. Optionally clean up the name

Categories:
- management: Project management, supervision, PM, general conditions with 0% markup
- labor_internal: Internal labor work done by RCG
- materials: Material costs
- subcontractors: Work done by external subcontractors

IMPORTANT:
- Do NOT change any dollar amounts
- Do NOT add or remove items
- Do NOT make boundary decisions
- ONLY classify and optionally clean names

Return JSON array with same length as input.`;

    const userPrompt = `Classify these ${items.length} items:
${items.map((item: any, i: number) => `${i + 1}. "${item.name}" | component: ${item.component} | vendor: ${item.vendorName || 'none'} | cost: $${item.cost}`).join('\n')}

Return JSON:
{
  "items": [
    { "category": "...", "normalizedName": "...", "confidence": 0.0-1.0 }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[enrich-estimate-items] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
