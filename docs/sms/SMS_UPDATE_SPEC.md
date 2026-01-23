# SMS Feature Update: Status Tracking & Validation

## Overview

This update adds:
1. Delivery status checking for sent messages
2. Quota/credit balance monitoring
3. Validation tests to confirm everything works

---

## Phase 1: Add Status Checking Edge Function

### Create: supabase/functions/check-sms-status/index.ts

```typescript
// supabase/functions/check-sms-status/index.ts

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

    // Call Textbelt status endpoint
    const response = await fetch(`https://textbelt.com/status/${textId}`);
    const result = await response.json();

    console.log(`📱 Status check for ${textId}:`, result);

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

## Phase 2: Add Quota Checking Edge Function

### Create: supabase/functions/check-sms-quota/index.ts

```typescript
// supabase/functions/check-sms-quota/index.ts

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

    // Get API key and check quota
    const textbeltKey = Deno.env.get('TEXTBELT_API_KEY');
    if (!textbeltKey) {
      throw new Error('TEXTBELT_API_KEY not configured');
    }

    const response = await fetch(`https://textbelt.com/quota/${textbeltKey}`);
    const result = await response.json();

    console.log('📱 Quota check:', result);

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

## Phase 3: Update SMSComposer UI

Add quota display and status refresh to the existing component:

### Add to SMSComposer.tsx

```typescript
// Add these state variables
const [quota, setQuota] = useState<number | null>(null);
const [isLoadingQuota, setIsLoadingQuota] = useState(false);

// Add quota fetch function
const fetchQuota = async () => {
  setIsLoadingQuota(true);
  try {
    const { data, error } = await supabase.functions.invoke('check-sms-quota');
    if (!error && data?.success) {
      setQuota(data.quotaRemaining);
    }
  } catch (err) {
    console.error('Failed to fetch quota:', err);
  }
  setIsLoadingQuota(false);
};

// Call on mount
useEffect(() => {
  fetchQuota();
}, []);

// Add to CardHeader area (after CardDescription)
{quota !== null && (
  <div className="flex items-center gap-2 mt-2">
    <Badge variant={quota > 20 ? 'default' : quota > 5 ? 'warning' : 'destructive'}>
      {quota} texts remaining
    </Badge>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={fetchQuota}
      disabled={isLoadingQuota}
    >
      <RefreshCw className={`h-3 w-3 ${isLoadingQuota ? 'animate-spin' : ''}`} />
    </Button>
  </div>
)}

// Show warning if low quota
{quota !== null && quota < 10 && (
  <Alert variant="warning" className="mt-2">
    <AlertDescription>
      Low SMS credits! Purchase more at textbelt.com/purchase
    </AlertDescription>
  </Alert>
)}
```

---

## Phase 4: Add Message History Component

### Create: src/components/sms/SMSHistory.tsx

```typescript
// src/components/sms/SMSHistory.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle2, Clock, XCircle, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SMSMessage {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  message_body: string;
  link_type: string | null;
  sent_at: string;
  delivery_status: string;
  textbelt_text_id: string | null;
  error_message: string | null;
}

const STATUS_CONFIG = {
  DELIVERED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  SENT: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  SENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  UNKNOWN: { icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  sent: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  delivered: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

export function SMSHistory() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const fetchMessages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sms_messages')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setMessages(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const refreshStatus = async (message: SMSMessage) => {
    if (!message.textbelt_text_id) return;

    setRefreshingId(message.id);

    try {
      const { data, error } = await supabase.functions.invoke('check-sms-status', {
        body: { textId: message.textbelt_text_id },
      });

      if (!error && data?.status) {
        // Update local state
        setMessages(prev =>
          prev.map(m =>
            m.id === message.id
              ? { ...m, delivery_status: data.status }
              : m
          )
        );

        // Update database
        await supabase
          .from('sms_messages')
          .update({
            delivery_status: data.status,
            status_checked_at: new Date().toISOString(),
          })
          .eq('id', message.id);
      }
    } catch (err) {
      console.error('Failed to refresh status:', err);
    }

    setRefreshingId(null);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNKNOWN;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>SMS History</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchMessages} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map(message => (
              <TableRow key={message.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{message.recipient_name}</div>
                    <div className="text-xs text-muted-foreground">{message.recipient_phone}</div>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate text-sm">{message.message_body}</div>
                  {message.link_type && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {message.link_type}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(message.sent_at), 'MMM d, h:mm a')}
                </TableCell>
                <TableCell>
                  {getStatusBadge(message.delivery_status)}
                </TableCell>
                <TableCell>
                  {message.textbelt_text_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshStatus(message)}
                      disabled={refreshingId === message.id}
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshingId === message.id ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No messages sent yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 5: Combine into SMS Admin Page

### Create: src/pages/admin/SMSAdmin.tsx

```typescript
// src/pages/admin/SMSAdmin.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SMSComposer } from '@/components/sms/SMSComposer';
import { SMSHistory } from '@/components/sms/SMSHistory';
import { MessageSquare, History } from 'lucide-react';

export default function SMSAdmin() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SMS Messaging</h1>
        <p className="text-muted-foreground">Send text messages to crew with app links</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">
            <MessageSquare className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <SMSComposer />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SMSHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Validation Checklist

After implementation, verify each item:

### 1. Database Validation

```sql
-- Check profiles has phone column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('phone', 'sms_notifications_enabled');

-- Check sms_messages table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'sms_messages';

-- Verify RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'sms_messages';
```

### 2. Edge Function Validation

Test each function from the command line or Supabase dashboard:

**Test send-sms (with _test key suffix):**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-sms' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recipientPhone": "5551234567",
    "message": "Test message",
    "linkType": "clock_in"
  }'
```

**Test check-sms-quota:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/check-sms-quota' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Test check-sms-status:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/check-sms-status' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"textId": "12345"}'
```

### 3. UI Validation Checklist

- [ ] Navigate to /admin/sms
- [ ] Quota badge shows remaining credits
- [ ] Recipient list loads with phone numbers
- [ ] Can select multiple recipients
- [ ] Templates populate message field
- [ ] Link type selector works
- [ ] Preview shows personalized message with link
- [ ] Send button disabled when no recipients/message
- [ ] Sending shows loading state
- [ ] Success/error toasts appear
- [ ] History tab shows sent messages
- [ ] Status refresh button updates delivery status

### 4. End-to-End Test

1. Add your phone number to your profile
2. Send yourself a test message with clock_in link
3. Verify SMS received on your phone
4. Tap link - verify it opens rcgwork.com/time-tracker
5. Check History tab - verify message appears
6. Click refresh on status - verify it updates to DELIVERED

### 5. Textbelt API Validation

**Direct API test (outside of app):**
```bash
# Check your quota directly
curl https://textbelt.com/quota/YOUR_API_KEY

# Expected response:
# {"success": true, "quotaRemaining": XX}
```

---

## Files Summary

| Action | File Path |
|--------|-----------|
| Create | `supabase/functions/check-sms-status/index.ts` |
| Create | `supabase/functions/check-sms-quota/index.ts` |
| Create | `src/components/sms/SMSHistory.tsx` |
| Create | `src/pages/admin/SMSAdmin.tsx` |
| Modify | `src/components/sms/SMSComposer.tsx` (add quota display) |
| Modify | Router (add /admin/sms route) |

---

## Troubleshooting

### "TEXTBELT_API_KEY not configured"
- Go to Supabase Dashboard → Settings → Edge Functions → Secrets
- Add `TEXTBELT_API_KEY` with your key

### Quota shows 0 or API returns error
- Verify key is correct at https://textbelt.com/quota/YOUR_KEY
- Purchase more credits if needed

### Status always shows "UNKNOWN"
- Some carriers don't report delivery status
- Status is only available for ~1 week after sending

### Messages not appearing in History
- Check RLS policies are applied
- Verify user has admin/manager role
