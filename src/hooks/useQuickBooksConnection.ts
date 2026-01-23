import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuickBooksConnection {
  id: string;
  realm_id: string;
  company_name: string | null;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
  last_error: string | null;
}

export function useQuickBooksConnection() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch current active connection
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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as QuickBooksConnection;
    },
  });

  const isConnected = !!connection;

  // Initiate OAuth connection
  const initiateConnection = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quickbooks-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate connection');
      }

      const { authUrl } = await response.json();

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

      if (!popup) {
        throw new Error('Failed to open popup. Please check your popup blocker settings.');
      }

      // Listen for completion message from callback page
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'quickbooks-oauth-success') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          toast.success('Successfully connected to QuickBooks!');
          queryClient.invalidateQueries({ queryKey: ['quickbooks-connection'] });
          setIsConnecting(false);
        } else if (event.data.type === 'quickbooks-oauth-error') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          toast.error('QuickBooks connection failed', {
            description: event.data.error || 'Unknown error occurred'
          });
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Error initiating QuickBooks connection:', error);
      toast.error('Failed to initiate connection', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsConnecting(false);
    }
  };

  // Disconnect from QuickBooks
  const disconnect = async () => {
    if (!connection) return;

    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from('quickbooks_connections')
        .update({ 
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      if (error) throw error;

      toast.success('Disconnected from QuickBooks');
      queryClient.invalidateQueries({ queryKey: ['quickbooks-connection'] });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect from QuickBooks');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return {
    connection,
    isLoading,
    error,
    isConnected,
    isConnecting,
    isDisconnecting,
    initiateConnection,
    disconnect,
  };
}
