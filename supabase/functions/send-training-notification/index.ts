import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  fetchBranding,
  buildBrandedEmail,
  buildHeroSection,
  buildCtaButton,
  buildNoticeBox,
  escapeHtml,
  EMAIL_COLORS,
  EMAIL_ICONS,
} from '../_shared/brandedTemplate.ts';

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

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('ResendAPI');
    if (!resendApiKey) {
      console.error('❌ ResendAPI secret not configured');
      throw new Error('Email service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      training_content_id,
      user_ids,
      notification_type,
      custom_message,
    } = await req.json() as TrainingNotificationRequest;

    console.log('📚 Processing training notification:', {
      contentId: training_content_id,
      userCount: user_ids.length,
      type: notification_type,
    });

    const branding = await fetchBranding(supabase);

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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`📧 Sending to ${users.length} users`);

    const resend = new Resend(resendApiKey);

    // Dynamic base URL from request origin
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
        // Generate magic link for direct access to training
        const redirectTo = `${baseUrl}/training/${training_content_id}`;
        const fallbackUrl = `${baseUrl}/auth?redirect=/training/${training_content_id}`;
        let trainingUrl = fallbackUrl;

        try {
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: user.email,
            options: { redirectTo },
          });

          if (linkError) {
            console.warn(`⚠️ Failed to generate magic link for ${user.email}:`, linkError.message);
          } else if (linkData?.properties?.action_link) {
            trainingUrl = linkData.properties.action_link;
            console.log(`✅ Magic link generated for ${user.email}`);
          } else {
            console.warn(`⚠️ Magic link generated but no action_link found for ${user.email}`);
          }
        } catch (linkGenError) {
          console.error(`❌ Error generating magic link for ${user.email}:`, linkGenError);
        }

        const subject = buildSubjectLine(notification_type, content.title);
        const emailHtml = buildTrainingEmailHtml({
          branding,
          userName: user.full_name || 'Team Member',
          content: content as TrainingContent,
          notificationType: notification_type,
          customMessage: custom_message,
          trainingUrl,
        });

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: `${branding.companyName} <noreply@rcgwork.com>`,
          to: user.email,
          subject,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`❌ Failed to send to ${user.email}:`, emailError);
          results.push({ userId: user.id, success: false, error: emailError.message });
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

        await logNotification(supabase, {
          training_content_id,
          user_id: user.id,
          notification_type,
          email_id: emailResult?.id || null,
          delivered: true,
          error_message: null,
        });

        await updateAssignmentTimestamp(supabase, training_content_id, user.id, notification_type);
      } catch (err) {
        const error = err as Error;
        console.error(`❌ Error processing user ${user.id}:`, error);
        results.push({ userId: user.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`📊 Complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ success: true, results, summary: { sent: successCount, failed: failCount } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const err = error as Error;
    console.error('❌ Fatal error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
  },
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
  type: string,
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
  branding: ReturnType<typeof fetchBranding> extends Promise<infer T> ? T : never;
  userName: string;
  content: TrainingContent;
  notificationType: string;
  customMessage?: string;
  trainingUrl: string;
}): string {
  const { branding, userName, content, notificationType, customMessage, trainingUrl } = params;

  const isOverdue = notificationType === 'overdue';
  const iconUrl = isOverdue ? EMAIL_ICONS.trainingOverdue : EMAIL_ICONS.training;
  const iconAlt = isOverdue ? 'Overdue Training' : 'Training';

  const heroTitle = isOverdue
    ? 'Overdue Training'
    : notificationType === 'reminder'
    ? 'Training Reminder'
    : 'New Training Assigned';

  const heroSubtitle = notificationType === 'assignment'
    ? `Hi ${escapeHtml(userName)}, you have been assigned new training content to complete.`
    : notificationType === 'reminder'
    ? `Hi ${escapeHtml(userName)}, this is a friendly reminder to complete your assigned training.`
    : `Hi ${escapeHtml(userName)}, the following training is now <strong style="color: ${EMAIL_COLORS.overdueBorder};">overdue</strong> and requires your immediate attention.`;

  // ── Hero ────────────────────────────────────────────────────────
  const heroHtml = buildHeroSection({
    iconUrl,
    iconAlt,
    title: heroTitle,
    subtitle: heroSubtitle,
    branding,
  });

  // ── Training details card ──────────────────────────────────────
  const cardBorderColor = isOverdue ? EMAIL_COLORS.overdueBorder : branding.primaryColor;
  const trainingCardHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
      <tr>
        <td style="background-color: ${isOverdue ? EMAIL_COLORS.overdueLight15 : EMAIL_COLORS.primaryLight08}; border-radius: 12px; padding: 28px; border-left: 4px solid ${cardBorderColor};">
          <p style="margin: 0 0 8px; color: ${branding.secondaryColor}; font-size: 20px; font-weight: 600;">
            ${escapeHtml(content.title)}
          </p>
          ${content.description ? `
            <p style="margin: 0 0 12px; color: ${EMAIL_COLORS.textTertiary}; font-size: 14px; line-height: 1.5;">
              ${escapeHtml(content.description)}
            </p>
          ` : ''}
          ${content.duration_minutes ? `
            <p style="margin: 0; color: ${EMAIL_COLORS.textLight}; font-size: 13px;">
              Estimated time: ${content.duration_minutes} minutes
            </p>
          ` : ''}
        </td>
      </tr>
    </table>
  `;

  // ── Custom message notice ──────────────────────────────────────
  const customMessageHtml = customMessage ? `
    <div style="margin-bottom: 32px;">
      ${buildNoticeBox({
        type: 'warning',
        html: `<strong>Note from admin:</strong> ${escapeHtml(customMessage)}`,
      })}
    </div>
  ` : '';

  // ── Overdue urgency notice ─────────────────────────────────────
  const overdueNoticeHtml = isOverdue ? `
    <div style="margin-bottom: 32px;">
      ${buildNoticeBox({
        type: 'action',
        html: '<strong>Action Required:</strong> This training is past its due date. Please complete it as soon as possible.',
      })}
    </div>
  ` : '';

  // ── Body ───────────────────────────────────────────────────────
  const bodyHtml = `
    <div style="margin-bottom: 32px;">
      ${trainingCardHtml}
    </div>

    ${customMessageHtml}
    ${overdueNoticeHtml}

    <div style="margin-bottom: 32px;">
      ${buildCtaButton({ href: trainingUrl, label: 'Start Training', branding })}
    </div>

    <p style="margin: 0; color: ${EMAIL_COLORS.textLight}; font-size: 13px; text-align: center; line-height: 1.6;">
      Click the button above to view and complete this training.<br>
      You can also access all your training from the ${escapeHtml(branding.companyAbbreviation)} Work app.
    </p>
  `;

  // ── Assemble ───────────────────────────────────────────────────
  const preheaderText = isOverdue
    ? `Overdue: ${content.title} - Requires immediate attention`
    : `${content.title} - Please complete when available`;

  return buildBrandedEmail(branding, {
    preheaderText,
    title: heroTitle,
    heroHtml,
    bodyHtml,
  });
}
