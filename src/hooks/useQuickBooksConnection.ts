/**
 * Hook for managing QuickBooks connection
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickBooksConnection {
  id: string;
  realm_id: string;
  company_name: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
}

export function useQuickBooksConnection() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch current connection
  const {
    data: connection,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quickbooks-connection'],
    queryFn: async (): Promise<QuickBooksConnection | null> => {
      const { data, error } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      if (error) {
        // Log error but don't throw for RLS/permission issues when no connection exists
        if (error.code === 'PGRST116' || error.code === '42501' || error.message?.includes('permission')) {
          console.warn('QuickBooks connection query:', error.message);
          return null;
        }
        throw error;
      }

      return data;
    },
  });

  // Initiate connection
  const initiateConnection = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('quickbooks-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        // Try to get detailed error from response data
        const errorDetail = response.data?.error || response.data?.details || response.error.message;
        console.error('QuickBooks connect error response:', response);
        throw new Error(errorDetail || 'Failed to initiate QuickBooks connection');
      }

      const { authUrl } = response.data;

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'quickbooks-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for completion message
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'quickbooks_connected') {
          toast.success(`Connected to ${event.data.companyName}`);
          queryClient.invalidateQueries({ queryKey: ['quickbooks-connection'] });
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed without completing
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect to QuickBooks');
      setIsConnecting(false);
    }
  };

  // Disconnect
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connection) return;

      const { error } = await supabase
        .from('quickbooks_connections')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Disconnected from QuickBooks');
      queryClient.invalidateQueries({ queryKey: ['quickbooks-connection'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect');
    },
  });

  return {
    connection,
    isLoading,
    error,
    isConnecting,
    isConnected: !!connection?.is_active,
    initiateConnection,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
