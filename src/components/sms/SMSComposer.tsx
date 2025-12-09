// src/components/sms/SMSComposer.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users, Link, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [quota, setQuota] = useState<number | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Fetch quota
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

  // Fetch field workers with phone numbers
  useEffect(() => {
    async function fetchRecipients() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, sms_notifications_enabled')
        .eq('is_active', true)
        .not('phone', 'is', null);

      if (!error && data) {
        setRecipients(data.map(p => ({
          id: p.id,
          full_name: p.full_name || 'Unknown',
          phone: p.phone,
          sms_notifications_enabled: p.sms_notifications_enabled ?? true,
        })));
      }
    }
    fetchRecipients();
    fetchQuota();
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
        const response = await supabase.functions.invoke('send-sms', {
          body: {
            recipientUserId: recipientId,
            message: personalizedMessage,
            linkType: linkType !== 'none' ? linkType : undefined,
            testMode,
          },
        });

        console.log(`📦 Full response for ${recipient.full_name}:`, JSON.stringify(response, null, 2));

        const { data, error } = response;

        // Check for HTTP error from edge function
        if (error) {
          console.error(`❌ HTTP error for ${recipient.full_name}:`, error);
          console.error(`📄 Response object:`, (response as any).response);
          
          // The Supabase client doesn't give us the error message easily
          // Direct users to check Network tab for actual error
          throw new Error('Edge function error - check browser Network tab for details (filter by "send-sms")');
        }
        
        // Check for application-level error in response data
        if (data?.error) {
          console.error(`❌ Application error for ${recipient.full_name}:`, data.error);
          throw new Error(data.error);
        }
        
        if (data?.success) {
          console.log(`✅ Sent to ${recipient.full_name}`, testMode ? '(TEST MODE)' : '');
          successCount++;
        } else {
          console.error(`❌ Unexpected response for ${recipient.full_name}:`, data);
          throw new Error('Unexpected response from server');
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Unknown error';
        console.error(`❌ Failed to send to ${recipient.full_name}:`, {
          message: errorMsg,
          fullError: err,
        });
        // Show error toast for first failure
        if (failCount === 0) {
          toast.error(`Error: ${errorMsg}`, { duration: 8000 });
        }
        failCount++;
      }
    }

    setIsSending(false);

    if (successCount > 0) {
      toast.success(`Sent ${successCount} message${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} message${failCount > 1 ? 's' : ''}. Check console for details.`);
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
        {quota !== null && (
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant={quota > 20 ? 'default' : quota > 5 ? 'secondary' : 'destructive'}
              className={quota > 20 ? 'bg-green-600 hover:bg-green-700' : quota > 5 ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
            >
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
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Low Quota Warning */}
        {quota !== null && quota < 10 && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertDescription>
              Low SMS credits! Purchase more at textbelt.com/purchase
            </AlertDescription>
          </Alert>
        )}
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

        {/* Test Mode */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="test-mode"
            checked={testMode}
            onCheckedChange={(checked) => setTestMode(checked === true)}
          />
          <label htmlFor="test-mode" className="text-sm text-muted-foreground cursor-pointer">
            Test mode (validates API call without delivering SMS or using credits)
          </label>
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
              {(() => {
                // Use first selected recipient's name, or fallback to first recipient, or "Recipient"
                const previewName = selectedRecipients.length > 0
                  ? recipients.find(r => r.id === selectedRecipients[0])?.full_name.split(' ')[0] || 'Recipient'
                  : recipients.length > 0
                  ? recipients[0].full_name.split(' ')[0]
                  : 'Recipient';
                return message.replace(/\{\{name\}\}/gi, previewName);
              })()}
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

