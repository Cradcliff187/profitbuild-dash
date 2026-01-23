# Training Module - Edge Function

> **File to create:** `supabase/functions/send-training-notification/index.ts`
> 
> **Also update:** `supabase/config.toml`

---

## Edge Function Code

```typescript
// supabase/functions/send-training-notification/index.ts
import { Resend } from 'npm:resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// INTERFACES
// =============================================================================

interface TrainingNotificationRequest {
  training_content_id: string;
  user_ids: string[];
  notification_type: 'assignment' | 'reminder' | 'overdue';
  custom_message?: string;
}

interface NotificationResult {
  userId: string;
  success: boolean;
  emailId?: string;
  error?: string;
}

interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  duration_minutes: number | null;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface CompanyBranding {
  company_name: string;
  company_legal_name: string;
  company_abbreviation: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  light_bg_color: string;
  logo_full_url: string;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment
    const resendApiKey = Deno.env.get('ResendAPI');
    if (!resendApiKey) {
      console.error('❌ ResendAPI secret not configured');
      throw new Error('Email service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { 
      training_content_id, 
      user_ids, 
      notification_type, 
      custom_message 
    } = await req.json() as TrainingNotificationRequest;

    console.log('📚 Processing training notification:', {
      contentId: training_content_id,
      userCount: user_ids.length,
      type: notification_type
    });

    // Fetch company branding (following existing pattern)
    const { data: branding } = await supabase
      .from('company_branding_settings')
      .select('*')
      .single();

    const brandingConfig: CompanyBranding = {
      company_name: branding?.company_name || 'Radcliff Construction Group',
      company_legal_name: branding?.company_legal_name || 'Radcliff Construction Group, LLC',
      company_abbreviation: branding?.company_abbreviation || 'RCG',
      primary_color: branding?.primary_color || '#cf791d',
      secondary_color: branding?.secondary_color || '#1b2b43',
      accent_color: branding?.accent_color || '#cf791d',
      light_bg_color: branding?.light_bg_color || '#f4f7f9',
      logo_full_url: branding?.logo_full_url || 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full%20Horizontal%20Logo%20-%201500x500.png',
    };

    // Fetch training content
    const { data: content, error: contentError } = await supabase
      .from('training_content')
      .select('id, title, description, content_type, duration_minutes')
      .eq('id', training_content_id)
      .single();

    if (contentError || !content) {
      console.error('❌ Training content not found:', contentError);
      throw new Error('Training content not found');
    }

    console.log('✅ Content found:', content.title);

    // Fetch users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', user_ids)
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw new Error('Failed to fetch users');
    }

    if (!users || users.length === 0) {
      console.warn('⚠️ No valid users found');
      return new Response(
        JSON.stringify({ success: true, results: [], message: 'No valid users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Sending to ${users.length} users`);

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Determine base URL from request origin
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://rcgwork.com';
    const baseUrl = new URL(origin).origin;

    // Process each user
    const results: NotificationResult[] = [];

    for (const user of users) {
      if (!user.email) {
        console.warn(`⚠️ User ${user.id} has no email, skipping`);
        results.push({ userId: user.id, success: false, error: 'No email address' });
        continue;
      }

      try {
        // Build deep link to training content
        const trainingUrl = `${baseUrl}/training/${training_content_id}`;

        // Build subject line
        const subject = buildSubjectLine(notification_type, content.title);

        // Build email HTML
        const emailHtml = buildTrainingEmailHtml({
          branding: brandingConfig,
          userName: user.full_name || 'Team Member',
          content: content as TrainingContent,
          notificationType: notification_type,
          customMessage: custom_message,
          trainingUrl,
        });

        // Send email
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: `${brandingConfig.company_name} <noreply@rcgwork.com>`,
          to: user.email,
          subject,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`❌ Failed to send to ${user.email}:`, emailError);
          results.push({ userId: user.id, success: false, error: emailError.message });
          
          // Log failed notification
          await logNotification(supabase, {
            training_content_id,
            user_id: user.id,
            notification_type,
            email_id: null,
            delivered: false,
            error_message: emailError.message,
          });
          continue;
        }

        console.log(`✅ Email sent to ${user.email}:`, emailResult?.id);
        results.push({ userId: user.id, success: true, emailId: emailResult?.id });

        // Log successful notification
        await logNotification(supabase, {
          training_content_id,
          user_id: user.id,
          notification_type,
          email_id: emailResult?.id || null,
          delivered: true,
          error_message: null,
        });

        // Update assignment notification timestamp
        await updateAssignmentTimestamp(supabase, training_content_id, user.id, notification_type);

      } catch (err) {
        const error = err as Error;
        console.error(`❌ Error processing user ${user.id}:`, error);
        results.push({ userId: user.id, success: false, error: error.message });
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`📊 Complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: { sent: successCount, failed: failCount }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const err = error as Error;
    console.error('❌ Fatal error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildSubjectLine(type: string, title: string): string {
  switch (type) {
    case 'assignment':
      return `New Training Assigned: ${title}`;
    case 'reminder':
      return `Training Reminder: ${title}`;
    case 'overdue':
      return `⚠️ Overdue Training: ${title}`;
    default:
      return `Training: ${title}`;
  }
}

async function logNotification(
  supabase: any,
  data: {
    training_content_id: string;
    user_id: string;
    notification_type: string;
    email_id: string | null;
    delivered: boolean;
    error_message: string | null;
  }
) {
  try {
    await supabase.from('training_notifications').insert(data);
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
}

async function updateAssignmentTimestamp(
  supabase: any,
  contentId: string,
  userId: string,
  type: string
) {
  try {
    const updateField = type === 'assignment' 
      ? { notification_sent_at: new Date().toISOString() }
      : type === 'reminder'
      ? { reminder_sent_at: new Date().toISOString() }
      : {};

    if (Object.keys(updateField).length > 0) {
      await supabase
        .from('training_assignments')
        .update(updateField)
        .eq('training_content_id', contentId)
        .eq('user_id', userId);
    }
  } catch (err) {
    console.error('Failed to update assignment timestamp:', err);
  }
}

// =============================================================================
// EMAIL TEMPLATE
// =============================================================================

function buildTrainingEmailHtml(params: {
  branding: CompanyBranding;
  userName: string;
  content: TrainingContent;
  notificationType: string;
  customMessage?: string;
  trainingUrl: string;
}): string {
  const { branding, userName, content, notificationType, customMessage, trainingUrl } = params;

  // Content type icon
  const icon = content.content_type.includes('video') ? '🎬' 
    : content.content_type === 'presentation' ? '📊' 
    : content.content_type === 'document' ? '📄' 
    : '🔗';

  // Urgency styling
  const isOverdue = notificationType === 'overdue';
  const urgencyColor = isOverdue ? '#dc2626' : branding.primary_color;
  const headerText = isOverdue ? '⚠️ Overdue Training' : notificationType === 'reminder' ? '⏰ Training Reminder' : '📚 New Training Assigned';

  // Message based on type
  const messageText = notificationType === 'assignment' 
    ? 'You have been assigned new training content to complete:'
    : notificationType === 'reminder'
    ? 'This is a friendly reminder to complete your assigned training:'
    : '<strong style="color: #dc2626;">Action Required:</strong> The following training is now overdue and requires your immediate attention:';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headerText}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${branding.light_bg_color}; -webkit-font-smoothing: antialiased;">
    
    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden;">
      ${content.title} - ${notificationType === 'overdue' ? 'Requires immediate attention' : 'Please complete when available'}
    </div>
    
    <!-- Email wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${branding.light_bg_color};">
      <tr>
        <td align="center" style="padding: 48px 20px;">
          
          <!-- Main container -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(27, 43, 67, 0.12); overflow: hidden;">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, ${branding.secondary_color} 0%, #243550 100%); padding: 40px 48px; text-align: center; border-bottom: 4px solid ${branding.primary_color};">
                <img src="${branding.logo_full_url}" alt="${branding.company_name}" style="max-width: 260px; height: auto; display: block; margin: 0 auto;" />
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 48px;">
                
                <!-- Icon -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 80px; height: 80px; background-color: ${urgencyColor}15; border-radius: 50%; line-height: 80px; font-size: 40px;">
                    ${icon}
                  </div>
                </div>
                
                <!-- Header text -->
                <h1 style="margin: 0 0 16px; text-align: center; color: ${branding.secondary_color}; font-size: 24px; font-weight: 600;">
                  ${headerText}
                </h1>
                
                <!-- Greeting -->
                <p style="margin: 0 0 16px; color: ${branding.secondary_color}; font-size: 16px;">
                  Hi ${userName},
                </p>
                
                <!-- Message -->
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                  ${messageText}
                </p>
                
                <!-- Training card -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 12px; border-left: 4px solid ${urgencyColor}; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 24px;">
                      <p style="margin: 0 0 8px; color: ${branding.secondary_color}; font-size: 20px; font-weight: 600;">
                        ${content.title}
                      </p>
                      ${content.description ? `
                        <p style="margin: 0 0 12px; color: #64748b; font-size: 14px; line-height: 1.5;">
                          ${content.description}
                        </p>
                      ` : ''}
                      ${content.duration_minutes ? `
                        <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                          ⏱️ Estimated time: ${content.duration_minutes} minutes
                        </p>
                      ` : ''}
                    </td>
                  </tr>
                </table>
                
                ${customMessage ? `
                  <!-- Custom message -->
                  <div style="margin: 0 0 24px; padding: 16px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      <strong>Note from admin:</strong><br>${customMessage}
                    </p>
                  </div>
                ` : ''}
                
                <!-- CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="padding: 8px 0 32px;">
                      <a href="${trainingUrl}" style="display: inline-block; background: linear-gradient(135deg, ${branding.primary_color} 0%, #b5691a 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(207, 121, 29, 0.3);">
                        Start Training →
                      </a>
                    </td>
                  </tr>
                </table>
                
                <!-- Help text -->
                <p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center;">
                  Click the button above to view and complete this training.<br>
                  You can also access all your training from the RCG Work app.
                </p>
                
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 32px 48px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, ${branding.light_bg_color} 100%); border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px; color: ${branding.secondary_color}; font-size: 15px; font-weight: 600;">
                  ${branding.company_legal_name}
                </p>
                <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                  © ${new Date().getFullYear()} ${branding.company_legal_name}. All Rights Reserved.<br>
                  This is an automated message from RCG Work.
                </p>
              </td>
            </tr>
            
          </table>
          
        </td>
      </tr>
    </table>
    
  </body>
</html>
  `;
}
```

---

## Config Update

Add to `supabase/config.toml`:

```toml
[functions.send-training-notification]
verify_jwt = false
```

---

## Deployment

```bash
# Deploy the function
supabase functions deploy send-training-notification

# Test the function (replace with actual IDs)
curl -X POST https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/send-training-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "training_content_id": "uuid-here",
    "user_ids": ["user-uuid-1", "user-uuid-2"],
    "notification_type": "assignment",
    "custom_message": "Please complete by Friday"
  }'
```

---

## Frontend Invocation

```typescript
// From React component or hook
const sendNotifications = async (
  contentId: string, 
  userIds: string[], 
  type: 'assignment' | 'reminder' | 'overdue',
  customMessage?: string
) => {
  const { data, error } = await supabase.functions.invoke('send-training-notification', {
    body: {
      training_content_id: contentId,
      user_ids: userIds,
      notification_type: type,
      custom_message: customMessage,
    }
  });

  if (error) {
    console.error('Failed to send notifications:', error);
    throw error;
  }

  return data;
};
```
