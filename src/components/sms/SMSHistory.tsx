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

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
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
    const upperStatus = status.toUpperCase();
    const config = STATUS_CONFIG[upperStatus] || STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
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

