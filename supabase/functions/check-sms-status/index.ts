// supabase/functions/check-sms-status/index.ts
// 
// Textbelt status endpoint is a GET request:
// GET https://textbelt.com/status/:textId
//
// Returns: {"status": "DELIVERED"} (or SENT, SENDING, FAILED, UNKNOWN)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface StatusRequest {
  textId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { textId }: StatusRequest = await req.json();

    if (!textId) {
      throw new Error('textId is required');
    }

    // GET request to Textbelt status endpoint
    // Ref: https://docs.textbelt.com/other-api-endpoints#checking-sms-delivery-status
    const response = await fetch(`https://textbelt.com/status/${textId}`);
    const result = await response.json();

    console.log(`📱 Status check for ${textId}:`, result);

    // Response format: {"status": "DELIVERED"}
    // Possible values: DELIVERED, SENT, SENDING, FAILED, UNKNOWN
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Status check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

