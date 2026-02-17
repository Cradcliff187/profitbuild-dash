import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  fetchBranding,
  buildBrandedEmail,
  buildHeroSection,
  buildCtaButton,
  buildNoticeBox,
  buildDetailCard,
  escapeHtml,
  EMAIL_COLORS,
  EMAIL_ICONS,
} from '../_shared/brandedTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptData {
  id: string;
  user_id: string;
  amount: number;
  payee_id?: string;
  project_id?: string;
  description?: string;
  captured_at: string;
  image_url: string;
}

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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const receiptData: ReceiptData = await req.json();
    console.log('📄 Processing receipt notification:', receiptData.id);

    const branding = await fetchBranding(supabase);

    // Dynamic base URL
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://rcgwork.com';
    const baseUrl = new URL(origin).origin;

    const resend = new Resend(resendApiKey);

    // ── Fetch receipt details ───────────────────────────────────────
    console.log('🔍 Fetching receipt:', receiptData.id);
    const { data: receiptRow, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptData.id)
      .single();

    if (receiptError) {
      console.error('❌ Error fetching receipt details:', receiptError);
      throw receiptError;
    }

    console.log('✅ Receipt fetched - user_id:', receiptRow.user_id, 'payee_id:', receiptRow.payee_id, 'project_id:', receiptRow.project_id);

    // Fetch profile
    let profile: { full_name?: string; email?: string } | null = null;
    if (receiptRow.user_id) {
      console.log('🔍 Fetching profile for user:', receiptRow.user_id);
      const { data: p, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', receiptRow.user_id)
        .single();
      if (profileError) {
        console.error('⚠️ Error fetching profile:', profileError);
      } else {
        profile = p;
        console.log('✅ Profile fetched:', profile?.full_name);
      }
    }

    // Fetch payee
    let payee: { payee_name?: string } | null = null;
    if (receiptRow.payee_id) {
      console.log('🔍 Fetching payee:', receiptRow.payee_id);
      const { data: py, error: payeeError } = await supabase
        .from('payees')
        .select('payee_name')
        .eq('id', receiptRow.payee_id)
        .single();
      if (payeeError) {
        console.error('⚠️ Error fetching payee:', payeeError);
      } else {
        payee = py;
        console.log('✅ Payee fetched:', payee?.payee_name);
      }
    }

    // Fetch project
    let project: { project_number?: string; project_name?: string } | null = null;
    if (receiptRow.project_id) {
      console.log('🔍 Fetching project:', receiptRow.project_id);
      const { data: pj, error: projectError } = await supabase
        .from('projects')
        .select('project_number, project_name')
        .eq('id', receiptRow.project_id)
        .single();
      if (projectError) {
        console.error('⚠️ Error fetching project:', projectError);
      } else {
        project = pj;
        console.log('✅ Project fetched:', project?.project_number);
      }
    }

    // ── Format data ─────────────────────────────────────────────────
    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(receiptRow.amount);
    const submittedDate = new Date(receiptRow.captured_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const formattedDate = new Date(receiptRow.captured_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    const employeeName = profile?.full_name || 'Unknown Employee';
    const employeeEmail = profile?.email || 'Unknown Email';
    const payeeName = payee?.payee_name || 'Not specified';
    const projectInfo = project
      ? `${project.project_number} - ${project.project_name}`
      : 'No project assigned';
    const description = receiptRow.description || '';

    // ── Build email ─────────────────────────────────────────────────
    const heroHtml = buildHeroSection({
      iconUrl: EMAIL_ICONS.receipt,
      iconAlt: 'Receipt Submitted',
      title: 'New Receipt Submitted',
      subtitle: 'A receipt has been submitted and is ready for review.',
      branding,
    });

    // Detail rows inside the card
    const detailRowsHtml = `
      <!-- Amount -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid ${EMAIL_COLORS.borderLight};">
        <tr>
          <td>
            <p style="margin: 0 0 4px; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Amount</p>
            <p style="margin: 0; color: ${branding.primaryColor}; font-size: 28px; font-weight: 700; line-height: 1.2;">${formattedAmount}</p>
          </td>
        </tr>
      </table>

      <!-- Submitted By -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
        <tr>
          <td>
            <p style="margin: 0 0 4px; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500;">Submitted By</p>
            <p style="margin: 0 0 2px; color: ${branding.secondaryColor}; font-size: 16px; font-weight: 600;">${escapeHtml(employeeName)}</p>
            <p style="margin: 0; color: ${EMAIL_COLORS.textTertiary}; font-size: 14px;">${escapeHtml(employeeEmail)}</p>
          </td>
        </tr>
      </table>

      <!-- Payee -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
        <tr>
          <td>
            <p style="margin: 0 0 4px; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500;">Payee/Vendor</p>
            <p style="margin: 0; color: ${branding.secondaryColor}; font-size: 16px; font-weight: 600;">${escapeHtml(payeeName)}</p>
          </td>
        </tr>
      </table>

      <!-- Project -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
        <tr>
          <td>
            <p style="margin: 0 0 4px; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500;">Project</p>
            <p style="margin: 0; color: ${branding.secondaryColor}; font-size: 16px; font-weight: 600;">${escapeHtml(projectInfo)}</p>
          </td>
        </tr>
      </table>

      ${description ? `
      <!-- Description -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
        <tr>
          <td>
            <p style="margin: 0 0 4px; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500;">Description</p>
            <p style="margin: 0; color: ${branding.secondaryColor}; font-size: 15px; line-height: 1.5;">${escapeHtml(description)}</p>
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Submitted Date -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td>
            <p style="margin: 0 0 4px; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500;">Submitted On</p>
            <p style="margin: 0; color: ${EMAIL_COLORS.textTertiary}; font-size: 14px;">${submittedDate}</p>
          </td>
        </tr>
      </table>
    `;

    const bodyHtml = `
      <div style="margin-bottom: 32px;">
        ${buildDetailCard({ branding, title: 'Receipt Details', contentHtml: detailRowsHtml })}
      </div>

      <div style="margin-bottom: 32px;">
        ${buildNoticeBox({
          type: 'action',
          html: '<strong>Action Required:</strong> A receipt image has been submitted and requires review. Please log in to the system to view the receipt image and process this submission.',
        })}
      </div>

      ${buildCtaButton({ href: `${baseUrl}/time-entries?tab=receipts`, label: 'Review Receipt', branding })}
    `;

    const emailHtml = buildBrandedEmail(branding, {
      preheaderText: `New receipt submitted: ${formattedAmount} from ${employeeName} for ${payeeName}`,
      title: 'New Receipt Submitted',
      heroHtml,
      bodyHtml,
    });

    // ── Send ──────────────────────────────────────────────────────
    console.log('📨 Sending receipt notification email...');
    const emailSubject = `${branding.companyAbbreviation} Receipt: ${project?.project_number || 'No Project'} - ${payeeName} - ${formattedDate}`;
    console.log('📧 Subject:', emailSubject);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${branding.companyName} <noreply@rcgwork.com>`,
      to: 'receipts@radcliffcg.com',
      reply_to: profile?.email || undefined,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('❌ Failed to send email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('✅ Receipt notification email sent successfully:', emailResult?.id);

    // Log email to database
    try {
      await supabase.from('email_messages').insert({
        recipient_email: 'receipts@radcliffcg.com',
        recipient_name: null,
        recipient_user_id: null,
        email_type: 'receipt-notification',
        subject: emailSubject,
        entity_type: 'receipt',
        entity_id: receiptData.id,
        project_id: receiptRow.project_id || null,
        sent_by: receiptRow.user_id || null,
        resend_email_id: emailResult?.id || null,
        delivery_status: emailResult?.id ? 'sent' : 'failed',
        error_message: null,
      });
    } catch (logError) {
      console.error('Failed to log email to database:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Receipt notification sent', emailId: emailResult?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('Error in send-receipt-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
