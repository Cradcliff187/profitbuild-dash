// supabase/functions/process-scheduled-sms/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Cron } from 'https://deno.land/x/croner@6.0.3/dist/croner.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ScheduledSMS {
  id: string;
  name: string;
  message_template: string;
  link_type: string | null;
  link_url: string | null;
  project_id: string | null;
  schedule_type: 'recurring' | 'one_time';
  cron_expression: string | null;
  scheduled_datetime: string | null;
  timezone: string;
  target_type: 'users' | 'roles';
  target_user_ids: string[] | null;
  target_roles: string[] | null;
  is_active: boolean;
  last_sent_at: string | null;
  created_by: string; // User who created the schedule
}

interface Recipient {
  user_id: string;
  phone: string;
  full_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    // This function is called by pg_cron - verify_jwt is disabled in config.toml
    // We still use service_role internally for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const nowUTC = now.toISOString();

    console.log(`🕐 Processing scheduled SMS at ${nowUTC}`);

    // Get all active scheduled messages
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('scheduled_sms_messages')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled messages: ${fetchError.message}`);
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log('✅ No active scheduled messages found');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${scheduledMessages.length} active scheduled message(s)`);

    let processedCount = 0;

    for (const schedule of scheduledMessages as ScheduledSMS[]) {
      try {
        let shouldRun = false;

        // Check if schedule should run
        if (schedule.schedule_type === 'recurring') {
          if (!schedule.cron_expression) {
            console.warn(`⚠️ Schedule ${schedule.id} (${schedule.name}) has no cron expression`);
            continue;
          }

          // Check if cron expression matches current time
          try {
            const cron = new Cron(schedule.cron_expression, { timezone: schedule.timezone });
            const lastRun = schedule.last_sent_at ? new Date(schedule.last_sent_at) : null;
            
            // Check if this minute matches the cron
            const prevMinute = new Date(now);
            prevMinute.setSeconds(0, 0);
            prevMinute.setMinutes(prevMinute.getMinutes() - 1);
            
            const nextRun = cron.nextRun(prevMinute);
            shouldRun = nextRun && nextRun <= now && (!lastRun || lastRun < prevMinute);
            
            if (shouldRun) {
              console.log(`⏰ Schedule ${schedule.id} (${schedule.name}) matches cron: ${schedule.cron_expression}`);
            }
          } catch (cronError) {
            console.error(`❌ Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expression}`, cronError);
            continue;
          }
        } else if (schedule.schedule_type === 'one_time') {
          if (!schedule.scheduled_datetime) {
            console.warn(`⚠️ Schedule ${schedule.id} (${schedule.name}) has no scheduled_datetime`);
            continue;
          }

          const scheduledTime = new Date(schedule.scheduled_datetime);
          const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
          
          // Check if scheduled time is within the last minute and hasn't been sent
          shouldRun = scheduledTime >= oneMinuteAgo && scheduledTime <= now && !schedule.last_sent_at;
          
          if (shouldRun) {
            console.log(`⏰ Schedule ${schedule.id} (${schedule.name}) one-time send time reached`);
          }
        }

        if (!shouldRun) {
          continue;
        }

        // Resolve recipients using database function
        const { data: recipients, error: recipientError } = await supabase.rpc(
          'get_scheduled_sms_recipients',
          {
            p_target_type: schedule.target_type,
            p_target_user_ids: schedule.target_user_ids || [],
            p_target_roles: schedule.target_roles || [],
          }
        );

        if (recipientError) {
          throw new Error(`Failed to resolve recipients: ${recipientError.message}`);
        }

        if (!recipients || recipients.length === 0) {
          console.warn(`⚠️ Schedule ${schedule.id} (${schedule.name}) has no eligible recipients`);
          
          // Log empty execution
          await supabase.from('scheduled_sms_logs').insert({
            scheduled_sms_id: schedule.id,
            recipients_count: 0,
            success_count: 0,
            failure_count: 0,
            error_details: { message: 'No eligible recipients found' },
          });
          
          // Update last_sent_at even if no recipients
          await supabase
            .from('scheduled_sms_messages')
            .update({ last_sent_at: nowUTC })
            .eq('id', schedule.id);
          
          continue;
        }

        console.log(`📱 Schedule ${schedule.id} (${schedule.name}): Sending to ${recipients.length} recipient(s)`);

        // Send SMS to each recipient
        const results: Array<{ user_id: string; success: boolean; error?: string }> = [];
        let successCount = 0;
        let failureCount = 0;

        for (const recipient of recipients as Recipient[]) {
          try {
            // Personalize message
            const personalizedMessage = schedule.message_template.replace(
              /\{\{name\}\}/gi,
              recipient.full_name.split(' ')[0]
            );

            // Call send-sms edge function with internalCall flag
            const sendSMSResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-sms`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  recipientUserId: recipient.user_id,
                  message: personalizedMessage,
                  linkType: schedule.link_type || undefined,
                  linkUrl: schedule.link_url || undefined,
                  projectId: schedule.project_id || undefined,
                  internalCall: true, // Flag to bypass user auth
                  scheduleCreatedBy: schedule.created_by, // Pass the schedule creator for logging
                }),
              }
            );

            const sendSMSResult = await sendSMSResponse.json();

            if (sendSMSResult.success) {
              successCount++;
              results.push({ user_id: recipient.user_id, success: true });
              console.log(`✅ Sent to ${recipient.full_name} (${recipient.phone})`);
            } else {
              failureCount++;
              const errorMsg = sendSMSResult.error || 'Unknown error';
              results.push({ user_id: recipient.user_id, success: false, error: errorMsg });
              console.error(`❌ Failed to send to ${recipient.full_name}: ${errorMsg}`);
            }
          } catch (sendError) {
            failureCount++;
            const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown error';
            results.push({ user_id: recipient.user_id, success: false, error: errorMsg });
            console.error(`❌ Error sending to ${recipient.full_name}:`, errorMsg);
          }
        }

        // Log execution
        await supabase.from('scheduled_sms_logs').insert({
          scheduled_sms_id: schedule.id,
          recipients_count: recipients.length,
          success_count: successCount,
          failure_count: failureCount,
          error_details: results.filter(r => !r.success).length > 0 
            ? results.filter(r => !r.success) 
            : null,
        });

        // Update last_sent_at
        await supabase
          .from('scheduled_sms_messages')
          .update({ last_sent_at: nowUTC })
          .eq('id', schedule.id);

        // If one-time and successful, mark as inactive
        if (schedule.schedule_type === 'one_time' && failureCount === 0) {
          await supabase
            .from('scheduled_sms_messages')
            .update({ is_active: false })
            .eq('id', schedule.id);
          console.log(`✅ One-time schedule ${schedule.id} completed and deactivated`);
        }

        processedCount++;
        console.log(`✅ Schedule ${schedule.id} (${schedule.name}): ${successCount} sent, ${failureCount} failed`);

      } catch (scheduleError) {
        console.error(`❌ Error processing schedule ${schedule.id}:`, scheduleError);
        // Continue with next schedule
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        timestamp: nowUTC 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Process Scheduled SMS Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

