// supabase/functions/send-sms/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SMSRequest {
  recipientUserId?: string;      // Send to specific user
  recipientPhone?: string;       // Or direct phone number
  message: string;
  linkType?: 'clock_in' | 'timesheet' | 'project' | 'receipt' | 'custom' | 'dashboard';
  linkUrl?: string;              // For custom links
  projectId?: string;            // For project-specific links
  testMode?: boolean;             // If true, appends _test to key (no credits used)
  internalCall?: boolean;        // If true, called from process-scheduled-sms (bypasses user auth)
  scheduleCreatedBy?: string;    // User ID who created the schedule (for internal calls)
}

// Deep link URL mappings
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
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get request data first to check if this is an internal call
    let requestData: SMSRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      throw new Error('Invalid request body');
    }
    const { recipientUserId, recipientPhone, message, linkType, linkUrl, projectId, testMode, internalCall, scheduleCreatedBy } = requestData;

    // Handle internal calls from process-scheduled-sms
    let sender: { id: string } | null = null;
    
    if (internalCall) {
      // Verify this is actually from process-scheduled-sms by checking service role key
      if (!authHeader.includes(supabaseServiceKey)) {
        throw new Error('Unauthorized - invalid service role key for internal call');
      }
      // For internal calls, use the schedule creator as the sender
      if (!scheduleCreatedBy) {
        throw new Error('scheduleCreatedBy is required for internal calls');
      }
      sender = { id: scheduleCreatedBy };
      console.log(`📱 Internal call from process-scheduled-sms - using schedule creator: ${scheduleCreatedBy}`);
    } else {
      // Normal user call - require authentication
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !authUser) {
        throw new Error('Unauthorized');
      }

      // Verify sender is admin/manager
      const { data: senderRoles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id);
      
      const isAuthorized = senderRoles?.some(r => ['admin', 'manager'].includes(r.role));
      if (!isAuthorized) {
        throw new Error('Only admins and managers can send SMS');
      }

      sender = authUser;
    }

    // Test mode: append _test to key (validates without using credits)
    if (testMode) {
      textbeltKey = `${textbeltKey}_test`;
      console.log('📱 TEST MODE - No credits will be used');
    }

    if (!message || !message.trim()) {
      throw new Error('Message is required');
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const errorMsg = `No phone number provided for recipient: ${recipientName}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`Processing phone for ${recipientName}: "${phone}"`);

    // Clean phone number (remove non-digits)
    // Textbelt accepts 10-digit US/Canada numbers or E.164 format
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log(`Cleaned phone: "${cleanPhone}" (${cleanPhone.length} digits)`);
    
    // Validate phone number format
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      const errorMsg = `Invalid phone number format for ${recipientName}. Original: "${phone}", Cleaned: "${cleanPhone}" (${cleanPhone.length} digits). Expected 10-11 digits.`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    // If 11 digits and starts with 1, remove the leading 1 (US country code)
    const finalPhone = cleanPhone.length === 11 && cleanPhone.startsWith('1') 
      ? cleanPhone.substring(1) 
      : cleanPhone;
    
    if (finalPhone.length !== 10) {
      const errorMsg = `Invalid phone number format for ${recipientName}. After cleaning: "${finalPhone}" (${finalPhone.length} digits). Expected exactly 10 digits.`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log(`Final phone for ${recipientName}: ${finalPhone}`);

    // Generate deep link if needed
    const finalLink = linkUrl || (linkType ? generateDeepLink(linkType, projectId) : null);

    // Append link to message if present
    let finalMessage = message;
    if (finalLink && !message.includes(finalLink)) {
      // Use single space instead of double newline to avoid potential encoding issues
      finalMessage = `${message} ${finalLink}`;
    }

    // Character limit check (SMS is 160 chars, but modern phones concatenate)
    if (finalMessage.length > 320) {
      console.warn('Message exceeds 320 chars, may be split into multiple SMS');
    }

    console.log('📱 Sending SMS:', {
      to: finalPhone,
      messageLength: finalMessage.length,
      hasLink: !!finalLink,
      linkValue: finalLink,
      testMode: !!testMode,
      messagePreview: finalMessage.substring(0, 100),
    });

    // Send via Textbelt - POST with JSON body
    // Ref: https://docs.textbelt.com/
    // In test mode, the _test suffix on the key validates without using credits
    const textbeltResponse = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: finalPhone,
        message: finalMessage,
        key: textbeltKey,
        // Required for regulatory compliance - identifies your business
        sender: 'Radcliff Construction Group',
      }),
    });

    const textbeltResult = await textbeltResponse.json();
    console.log('📱 Textbelt response:', textbeltResult);
    
    // If Textbelt returned an error, log the full details
    if (!textbeltResult.success) {
      console.error('❌ Textbelt API error:', {
        error: textbeltResult.error,
        fullResponse: textbeltResult,
        requestPayload: {
          phone: finalPhone,
          messageLength: finalMessage.length,
          hasLink: !!finalLink,
        }
      });
    }

    // Log to sms_messages table (skip in test mode)
    // For internal calls, sent_by will be null (system-initiated, actual sender tracked in scheduled_sms_messages)
    if (!testMode) {
      const { error: logError } = await supabase
        .from('sms_messages')
        .insert({
          recipient_user_id: recipientId,
          recipient_phone: finalPhone,
          recipient_name: recipientName,
          message_body: finalMessage,
          link_type: linkType,
          link_url: finalLink,
          sent_by: sender.id, // Use schedule creator for internal calls, user for manual sends
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
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

