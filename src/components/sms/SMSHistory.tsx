// src/components/sms/SMSHistory.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle2, Clock, XCircle, HelpCircle, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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
  textbelt_http_status: number | null;
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
  const isMobile = useIsMobile();

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

  const getStatusBadge = (status: string, errorMessage?: string | null, httpStatus?: number | null) => {
    const upperStatus = status.toUpperCase();
    const config = STATUS_CONFIG[upperStatus] || STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
    const Icon = config.icon;
    const isFailed = status.toLowerCase() === 'failed';

    const badge = (
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );

    // Show tooltip with error details for failed messages
    if (isFailed && (errorMessage || httpStatus)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                {badge}
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1 text-xs">
                <div className="font-semibold">Error Details:</div>
                {errorMessage && <div>{errorMessage}</div>}
                {httpStatus && <div className="text-muted-foreground">HTTP Status: {httpStatus}</div>}
                {!errorMessage && !httpStatus && <div className="text-muted-foreground">No error details available</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
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
        {messages.length === 0 && !isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            No messages sent yet
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block">
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
                  {messages.map(message => {
                    const isFailed = message.delivery_status.toLowerCase() === 'failed';
                    return (
                      <TableRow key={message.id} className={isFailed ? 'bg-destructive/5' : ''}>
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
                          {getStatusBadge(message.delivery_status, message.error_message, message.textbelt_http_status)}
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {messages.map(message => {
                const isFailed = message.delivery_status.toLowerCase() === 'failed';
                return (
                  <Card key={message.id} className={`overflow-hidden ${isFailed ? 'border-destructive/50' : ''}`}>
                    <CardHeader className={`p-3 ${isFailed ? 'bg-destructive/5' : 'bg-gradient-to-r from-primary/5 to-transparent'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="font-medium text-sm truncate">{message.recipient_name}</div>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{message.recipient_phone}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(message.delivery_status, message.error_message, message.textbelt_http_status)}
                          {message.textbelt_text_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => refreshStatus(message)}
                              disabled={refreshingId === message.id}
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === message.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 pt-2">
                      {/* Error Alert for Failed Messages */}
                      {isFailed && (message.error_message || message.textbelt_http_status) && (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <AlertDescription className="text-xs ml-6">
                            <div className="font-semibold mb-0.5">Delivery Failed</div>
                            {message.error_message && <div>{message.error_message}</div>}
                            {message.textbelt_http_status && (
                              <div className="text-[10px] mt-0.5 opacity-75">
                                HTTP Status: {message.textbelt_http_status}
                              </div>
                            )}
                            {!message.error_message && !message.textbelt_http_status && (
                              <div className="opacity-75">No error details available</div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>Message</span>
                        </div>
                        <div className="text-sm">{message.message_body}</div>
                        {message.link_type && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {message.link_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{format(new Date(message.sent_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

