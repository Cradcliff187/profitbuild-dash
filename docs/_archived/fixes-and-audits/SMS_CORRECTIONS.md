# SMS Edge Function - Corrected Version

## Key Corrections from Official Docs

1. **Added `sender` parameter** - Required for regulatory compliance
2. **Added test mode documentation** - Append `_test` to API key for testing
3. **Confirmed HTTP methods** - POST for /text, GET for /status and /quota

---

## Corrected: supabase/functions/send-sms/index.ts

```typescript
// supabase/functions/send-sms/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  recipientUserId?: string;
  recipientPhone?: string;
  message: string;
  linkType?: 'clock_in' | 'timesheet' | 'project' | 'receipt' | 'custom';
  linkUrl?: string;
  projectId?: string;
  testMode?: boolean; // If true, appends _test to key (no credits used)
}

const BASE_URL = 'https://rcgwork.com';

function generateDeepLink(linkType: string, projectId?: string): string {
  switch (linkType) {
    case 'clock_in':
      return `${BASE_URL}/time-tracker`;
    case 'timesheet':
      return `${BASE_URL}/time-tracker?view=history`;
    case 'project':
      return projectId ? `${BASE_URL}/projects/${projectId}` : `${BASE_URL}/projects`;
    case 'receipt':
      return `${BASE_URL}/receipts/capture`;
    case 'dashboard':
      return `${BASE_URL}/`;
    default:
      return BASE_URL;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Textbelt API key from secrets
    let textbeltKey = Deno.env.get('TEXTBELT_API_KEY');
    if (!textbeltKey) {
      throw new Error('TEXTBELT_API_KEY not configured');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data
    const { 
      recipientUserId, 
      recipientPhone, 
      message, 
      linkType, 
      linkUrl, 
      projectId,
      testMode 
    }: SMSRequest = await req.json();

    // Test mode: append _test to key (validates without using credits)
    if (testMode) {
      textbeltKey = `${textbeltKey}_test`;
      console.log('📱 TEST MODE - No credits will be used');
    }

    // Get sender info from auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: sender } } = await supabase.auth.getUser(token);
    
    if (!sender) {
      throw new Error('Unauthorized');
    }

    // Verify sender is admin/manager
    const { data: senderRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', sender.id);
    
    const isAuthorized = senderRoles?.some(r => ['admin', 'manager'].includes(r.role));
    if (!isAuthorized) {
      throw new Error('Only admins and managers can send SMS');
    }

    // Resolve recipient phone number
    let phone = recipientPhone;
    let recipientName = 'Unknown';
    let recipientId = recipientUserId;

    if (recipientUserId && !recipientPhone) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, full_name, sms_notifications_enabled')
        .eq('id', recipientUserId)
        .single();

      if (!profile?.phone) {
        throw new Error('Recipient has no phone number on file');
      }

      if (!profile.sms_notifications_enabled) {
        throw new Error('Recipient has opted out of SMS notifications');
      }

      phone = profile.phone;
      recipientName = profile.full_name || 'Team Member';
    }

    if (!phone) {
      throw new Error('No phone number provided');
    }

    // Clean phone number (remove non-digits)
    // Textbelt accepts 10-digit US/Canada numbers or E.164 format
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Generate deep link if needed
    const finalLink = linkUrl || (linkType ? generateDeepLink(linkType, projectId) : null);

    // Append link to message if present
    let finalMessage = message;
    if (finalLink && !message.includes(finalLink)) {
      finalMessage = `${message}\n\n${finalLink}`;
    }

    console.log('📱 Sending SMS:', {
      to: cleanPhone,
      messageLength: finalMessage.length,
      hasLink: !!finalLink,
      testMode: !!testMode,
    });

    // Send via Textbelt - POST with JSON body
    // Ref: https://docs.textbelt.com/
    const textbeltResponse = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        message: finalMessage,
        key: textbeltKey,
        // Required for regulatory compliance - identifies your business
        sender: 'Radcliff Construction Group',
      }),
    });

    const textbeltResult = await textbeltResponse.json();
    console.log('📱 Textbelt response:', textbeltResult);

    // Log to sms_messages table (skip in test mode)
    if (!testMode) {
      const { error: logError } = await supabase
        .from('sms_messages')
        .insert({
          recipient_user_id: recipientId,
          recipient_phone: cleanPhone,
          recipient_name: recipientName,
          message_body: finalMessage,
          link_type: linkType,
          link_url: finalLink,
          sent_by: sender.id,
          project_id: projectId,
          textbelt_text_id: textbeltResult.textId?.toString(),
          delivery_status: textbeltResult.success ? 'sent' : 'failed',
          error_message: textbeltResult.success ? null : textbeltResult.error,
        });

      if (logError) {
        console.error('Failed to log SMS:', logError);
      }
    }

    if (!textbeltResult.success) {
      throw new Error(textbeltResult.error || 'Failed to send SMS');
    }

    return new Response(
      JSON.stringify({
        success: true,
        textId: textbeltResult.textId,
        quotaRemaining: textbeltResult.quotaRemaining,
        testMode: !!testMode,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ SMS Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

---

## Corrected: supabase/functions/check-sms-status/index.ts

```typescript
// supabase/functions/check-sms-status/index.ts
// 
// Textbelt status endpoint is a GET request:
// GET https://textbelt.com/status/:textId
//
// Returns: {"status": "DELIVERED"} (or SENT, SENDING, FAILED, UNKNOWN)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
```

---

## Corrected: supabase/functions/check-sms-quota/index.ts

```typescript
// supabase/functions/check-sms-quota/index.ts
//
// Textbelt quota endpoint is a GET request:
// GET https://textbelt.com/quota/:key
//
// Returns: {"success": true, "quotaRemaining": 98}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller is admin/manager
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = roles?.some(r => ['admin', 'manager'].includes(r.role));
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    // Get API key
    const textbeltKey = Deno.env.get('TEXTBELT_API_KEY');
    if (!textbeltKey) {
      throw new Error('TEXTBELT_API_KEY not configured');
    }

    // GET request to Textbelt quota endpoint
    // Ref: https://docs.textbelt.com/other-api-endpoints#checking-your-credit-balance
    const response = await fetch(`https://textbelt.com/quota/${textbeltKey}`);
    const result = await response.json();

    console.log('📱 Quota check:', result);

    // Response format: {"success": true, "quotaRemaining": 98}
    return new Response(
      JSON.stringify({
        success: result.success,
        quotaRemaining: result.quotaRemaining,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Quota check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

---

## Summary of Corrections

| Item | Original | Corrected |
|------|----------|-----------|
| `sender` parameter | Missing | Added `sender: 'Radcliff Construction Group'` for compliance |
| Test mode | Not documented | Added `testMode` flag that appends `_test` to key |
| HTTP methods | Correct but undocumented | Added comments clarifying POST for /text, GET for /status and /quota |
| Phone format | Added prefix "1" | Removed - Textbelt handles 10-digit US numbers directly |

---

## Testing Without Using Credits

Add a "Test Mode" checkbox to the UI that sets `testMode: true`:

```typescript
// In SMSComposer.tsx
const [testMode, setTestMode] = useState(false);

// In the form
<div className="flex items-center gap-2">
  <Checkbox
    id="test-mode"
    checked={testMode}
    onCheckedChange={setTestMode}
  />
  <label htmlFor="test-mode" className="text-sm text-muted-foreground">
    Test mode (validates without sending or using credits)
  </label>
</div>

// In handleSend
const { data, error } = await supabase.functions.invoke('send-sms', {
  body: {
    recipientUserId: recipientId,
    message: personalizedMessage,
    linkType: linkType !== 'none' ? linkType : undefined,
    testMode, // Add this
  },
});
```

When test mode is enabled:
- Appends `_test` to the API key
- Textbelt validates the request but doesn't send
- No credits are deducted
- Message is not logged to sms_messages table
