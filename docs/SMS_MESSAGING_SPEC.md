# SMS Messaging Feature Specification

## Overview

Enable admins to send SMS text messages to field workers with clickable deep links that open directly in the RCG Work PWA (or browser fallback).

**Provider:** Textbelt (https://textbelt.com)  
**Cost:** ~$0.03-0.05 per text (prepaid, no subscription)

---

## Feature Requirements

### Admin Capabilities
1. Compose and send SMS messages from the UI
2. Select recipients: individual, by role, by project assignment, or all field workers
3. Insert smart links that deep-link to specific app pages
4. View sent message history and delivery status
5. Use message templates for common notifications

### Field Worker Experience
1. Receive SMS with clickable link
2. Tap link → opens PWA directly (if installed) or browser
3. Link goes to relevant page (time tracker, project, etc.)

---

## Phase 1: Database Schema

### Migration: Add phone to profiles

```sql
-- Migration: add_phone_to_profiles.sql

-- Add phone number field to profiles
ALTER TABLE profiles 
ADD COLUMN phone TEXT;

-- Add index for lookups
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- Add sms_enabled preference (user can opt out)
ALTER TABLE profiles 
ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.phone IS 'Mobile phone number for SMS notifications (E.164 format preferred, e.g., +15551234567)';
COMMENT ON COLUMN profiles.sms_notifications_enabled IS 'Whether user wants to receive SMS notifications';
```

### New Table: sms_messages (for history/tracking)

```sql
-- Migration: create_sms_messages_table.sql

CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient info
  recipient_user_id UUID REFERENCES profiles(id),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  
  -- Message content
  message_body TEXT NOT NULL,
  link_type TEXT, -- 'clock_in', 'timesheet', 'project', 'custom', etc.
  link_url TEXT,
  
  -- Sending info
  sent_by UUID REFERENCES profiles(id) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  
  -- Textbelt response
  textbelt_text_id TEXT,
  delivery_status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  status_checked_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Context
  project_id UUID REFERENCES projects(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sms_messages_recipient ON sms_messages(recipient_user_id);
CREATE INDEX idx_sms_messages_sent_by ON sms_messages(sent_by);
CREATE INDEX idx_sms_messages_sent_at ON sms_messages(sent_at DESC);
CREATE INDEX idx_sms_messages_project ON sms_messages(project_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(delivery_status);

-- RLS Policies
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Admins/managers can view all messages
CREATE POLICY "Admins can view all SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins/managers can insert messages
CREATE POLICY "Admins can send SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Users can see messages sent to them
CREATE POLICY "Users can view their own SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());
```

### New Table: sms_templates

```sql
-- Migration: create_sms_templates_table.sql

CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  link_type TEXT, -- matches link types in UI
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default templates
INSERT INTO sms_templates (name, description, message_template, link_type) VALUES
  ('Clock In Reminder', 'Remind worker to clock in', 'Hey {{first_name}}, friendly reminder to clock in for today. Tap here: {{link}}', 'clock_in'),
  ('Timesheet Review', 'Ask worker to review timesheet', 'Hi {{first_name}}, please review your timesheet for this week. Tap here: {{link}}', 'timesheet'),
  ('Project Assignment', 'Notify of new project assignment', '{{first_name}}, you''ve been assigned to {{project_name}}. View details: {{link}}', 'project'),
  ('Custom Message', 'Blank template for custom messages', '{{message}}', 'custom');
```

---

## Phase 2: Edge Function

### Create: supabase/functions/send-sms/index.ts

```typescript
// supabase/functions/send-sms/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  recipientUserId?: string;      // Send to specific user
  recipientPhone?: string;       // Or direct phone number
  message: string;
  linkType?: 'clock_in' | 'timesheet' | 'project' | 'receipt' | 'custom';
  linkUrl?: string;              // For custom links
  projectId?: string;            // For project-specific links
}

// Deep link URL mappings
const BASE_URL = 'https://rcgwork.com'; // or your production URL

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
    const textbeltKey = Deno.env.get('TEXTBELT_API_KEY');
    if (!textbeltKey) {
      throw new Error('TEXTBELT_API_KEY not configured');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data
    const { recipientUserId, recipientPhone, message, linkType, linkUrl, projectId }: SMSRequest = await req.json();

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

    // Clean phone number (remove non-digits, ensure US format)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;

    // Generate deep link if needed
    const finalLink = linkUrl || (linkType ? generateDeepLink(linkType, projectId) : null);

    // Append link to message if present
    let finalMessage = message;
    if (finalLink && !message.includes(finalLink)) {
      finalMessage = `${message}\n\n${finalLink}`;
    }

    // Character limit check (SMS is 160 chars, but modern phones concatenate)
    if (finalMessage.length > 320) {
      console.warn('Message exceeds 320 chars, may be split into multiple SMS');
    }

    console.log('📱 Sending SMS:', {
      to: formattedPhone,
      messageLength: finalMessage.length,
      hasLink: !!finalLink,
    });

    // Send via Textbelt
    const textbeltResponse = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formattedPhone,
        message: finalMessage,
        key: textbeltKey,
      }),
    });

    const textbeltResult = await textbeltResponse.json();
    console.log('📱 Textbelt response:', textbeltResult);

    // Log to sms_messages table
    const { error: logError } = await supabase
      .from('sms_messages')
      .insert({
        recipient_user_id: recipientId,
        recipient_phone: formattedPhone,
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

    if (!textbeltResult.success) {
      throw new Error(textbeltResult.error || 'Failed to send SMS');
    }

    return new Response(
      JSON.stringify({
        success: true,
        textId: textbeltResult.textId,
        quotaRemaining: textbeltResult.quotaRemaining,
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

## Phase 3: Admin UI Component

### Create: src/components/sms/SMSComposer.tsx

```typescript
// src/components/sms/SMSComposer.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users, Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Recipient {
  id: string;
  full_name: string;
  phone: string | null;
  sms_notifications_enabled: boolean;
}

const LINK_TYPES = [
  { value: 'none', label: 'No Link' },
  { value: 'clock_in', label: 'Clock In Page', preview: '/time-tracker' },
  { value: 'timesheet', label: 'Timesheet History', preview: '/time-tracker?view=history' },
  { value: 'receipt', label: 'Capture Receipt', preview: '/receipts/capture' },
  { value: 'dashboard', label: 'Dashboard', preview: '/' },
  { value: 'project', label: 'Specific Project', preview: '/projects/{id}' },
];

const DEFAULT_TEMPLATES = [
  { name: 'Clock In Reminder', message: 'Hey {{name}}, friendly reminder to clock in for today.' },
  { name: 'Timesheet Review', message: 'Hi {{name}}, please review and submit your timesheet for this week.' },
  { name: 'End of Day', message: '{{name}}, don\'t forget to clock out and submit any receipts before you leave.' },
];

export function SMSComposer() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [linkType, setLinkType] = useState('none');
  const [isSending, setIsSending] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch field workers with phone numbers
  useEffect(() => {
    async function fetchRecipients() {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          sms_notifications_enabled,
          user_roles!inner(role)
        `)
        .eq('is_active', true)
        .not('phone', 'is', null);

      if (!error && data) {
        // Filter to field workers (or all users with phones)
        setRecipients(data.map(p => ({
          id: p.id,
          full_name: p.full_name || 'Unknown',
          phone: p.phone,
          sms_notifications_enabled: p.sms_notifications_enabled ?? true,
        })));
      }
    }
    fetchRecipients();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRecipients(
        recipients
          .filter(r => r.phone && r.sms_notifications_enabled)
          .map(r => r.id)
      );
    } else {
      setSelectedRecipients([]);
    }
  };

  const handleRecipientToggle = (id: string) => {
    setSelectedRecipients(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const handleTemplateSelect = (template: typeof DEFAULT_TEMPLATES[0]) => {
    setMessage(template.message);
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const recipientId of selectedRecipients) {
      const recipient = recipients.find(r => r.id === recipientId);
      if (!recipient) continue;

      // Replace {{name}} placeholder
      const personalizedMessage = message.replace(/\{\{name\}\}/gi, recipient.full_name.split(' ')[0]);

      try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            recipientUserId: recipientId,
            message: personalizedMessage,
            linkType: linkType !== 'none' ? linkType : undefined,
          },
        });

        if (error) throw error;
        if (data?.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Failed to send to ${recipient.full_name}:`, err);
        failCount++;
      }
    }

    setIsSending(false);

    if (successCount > 0) {
      toast.success(`Sent ${successCount} message${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} message${failCount > 1 ? 's' : ''}`);
    }

    // Reset form on success
    if (failCount === 0) {
      setMessage('');
      setSelectedRecipients([]);
      setSelectAll(false);
    }
  };

  const selectedLink = LINK_TYPES.find(l => l.value === linkType);
  const charCount = message.length;
  const estimatedSMS = Math.ceil(charCount / 160) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Send SMS to Crew
        </CardTitle>
        <CardDescription>
          Send text messages with app links to field workers
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Recipients Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Recipients</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground">
                Select all ({recipients.filter(r => r.phone && r.sms_notifications_enabled).length})
              </label>
            </div>
          </div>

          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members with phone numbers found
              </p>
            ) : (
              recipients.map(recipient => (
                <div key={recipient.id} className="flex items-center gap-2">
                  <Checkbox
                    id={recipient.id}
                    checked={selectedRecipients.includes(recipient.id)}
                    onCheckedChange={() => handleRecipientToggle(recipient.id)}
                    disabled={!recipient.phone || !recipient.sms_notifications_enabled}
                  />
                  <label
                    htmlFor={recipient.id}
                    className={`text-sm flex-1 ${!recipient.phone || !recipient.sms_notifications_enabled ? 'text-muted-foreground' : ''}`}
                  >
                    {recipient.full_name}
                    {!recipient.phone && (
                      <Badge variant="outline" className="ml-2 text-xs">No phone</Badge>
                    )}
                    {recipient.phone && !recipient.sms_notifications_enabled && (
                      <Badge variant="outline" className="ml-2 text-xs">Opted out</Badge>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>

          {selectedRecipients.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <Users className="h-4 w-4 inline mr-1" />
              {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Quick Templates */}
        <div className="space-y-2">
          <Label>Quick Templates</Label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TEMPLATES.map(template => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => handleTemplateSelect(template)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Type your message... Use {{name}} for personalization"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Use {"{{name}}"} to insert recipient's first name</span>
            <span>{charCount} chars (~{estimatedSMS} SMS)</span>
          </div>
        </div>

        {/* Link Type */}
        <div className="space-y-2">
          <Label>Include App Link</Label>
          <Select value={linkType} onValueChange={setLinkType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINK_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.value !== 'none' && <Link className="h-3 w-3" />}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLink && selectedLink.preview && (
            <p className="text-xs text-muted-foreground">
              Link will open: rcgwork.com{selectedLink.preview}
            </p>
          )}
        </div>

        {/* Preview */}
        {message && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">
              {message.replace(/\{\{name\}\}/gi, 'Danny')}
              {linkType !== 'none' && (
                <>
                  {'\n\n'}
                  <span className="text-blue-600 underline">
                    https://rcgwork.com{selectedLink?.preview || '/'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isSending || selectedRecipients.length === 0 || !message.trim()}
          className="w-full"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send to {selectedRecipients.length} Recipient{selectedRecipients.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 4: Add Phone Field to User Management

### Modify existing user edit form to include phone field

Add to the user profile edit form (likely in UserManagement or similar):

```typescript
// Add to user form fields
<div className="space-y-2">
  <Label htmlFor="phone">Mobile Phone (for SMS)</Label>
  <Input
    id="phone"
    type="tel"
    placeholder="(555) 123-4567"
    value={phone}
    onChange={e => setPhone(e.target.value)}
  />
  <p className="text-xs text-muted-foreground">
    Used for clock-in reminders and team notifications
  </p>
</div>

<div className="flex items-center gap-2">
  <Checkbox
    id="sms-enabled"
    checked={smsEnabled}
    onCheckedChange={setSmsEnabled}
  />
  <label htmlFor="sms-enabled" className="text-sm">
    Receive SMS notifications
  </label>
</div>
```

---

## Phase 5: Route & Navigation

### Add SMS page to admin routes

```typescript
// In App.tsx or routes file
import { SMSComposer } from '@/components/sms/SMSComposer';

// Add route (admin only)
<Route path="/admin/sms" element={<SMSComposer />} />
```

### Add to admin navigation

```typescript
// In sidebar or admin menu
{
  title: 'Send SMS',
  href: '/admin/sms',
  icon: MessageSquare,
}
```

---

## Phase 6: Supabase Setup

### Add Textbelt API Key to Secrets

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```
TEXTBELT_API_KEY=your_key_here
```

### Purchase Textbelt Credits

1. Go to https://textbelt.com/purchase/
2. Buy a key (start with 200 texts for $10 to test)
3. Add key to Supabase secrets

---

## Files Summary

| Action | File Path |
|--------|-----------|
| Create Migration | `supabase/migrations/xxx_add_phone_to_profiles.sql` |
| Create Migration | `supabase/migrations/xxx_create_sms_tables.sql` |
| Create Edge Function | `supabase/functions/send-sms/index.ts` |
| Create Component | `src/components/sms/SMSComposer.tsx` |
| Modify | User management forms (add phone field) |
| Modify | `src/App.tsx` (add route) |
| Modify | Admin navigation (add menu item) |

---

## Deep Link Reference

| Link Type | URL | Opens To |
|-----------|-----|----------|
| `clock_in` | `/time-tracker` | Time tracker with clock in button |
| `timesheet` | `/time-tracker?view=history` | Timesheet history view |
| `receipt` | `/receipts/capture` | Receipt camera capture |
| `project` | `/projects/{id}` | Specific project details |
| `dashboard` | `/` | Main dashboard |

**How deep links work:**
- If PWA is installed → link opens directly in the app
- If not installed → opens in mobile browser
- No special configuration needed - standard web URLs

---

## Example SMS Messages

**Clock-in Reminder:**
```
Hey Danny, friendly reminder to clock in for today.

https://rcgwork.com/time-tracker
```

**Project Assignment:**
```
John, you've been assigned to Project 2024-027 (Smith Residence). View details here:

https://rcgwork.com/projects/abc123-uuid
```

**End of Day:**
```
Tom, don't forget to clock out and submit any receipts before you leave.

https://rcgwork.com/time-tracker
```

---

## Cost Estimate

| Scenario | Texts/Month | Cost |
|----------|-------------|------|
| 5 workers, daily reminder | ~100 | ~$3-5 |
| 10 workers, daily + weekly | ~250 | ~$8-10 |
| 20 workers, multiple alerts | ~500 | ~$15-20 |

---

## Testing Checklist

- [ ] Add phone number to test user profile
- [ ] Send test SMS to yourself
- [ ] Verify link opens PWA (if installed)
- [ ] Verify link opens browser (if not installed)
- [ ] Check message logged in sms_messages table
- [ ] Test delivery status tracking
- [ ] Test with multiple recipients
- [ ] Verify opt-out is respected
