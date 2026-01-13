/**
 * QuickBooks connection settings panel
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link2, Unlink, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksFeatureFlag } from '@/hooks/useFeatureFlag';
import { format } from 'date-fns';

export function QuickBooksSettings() {
  const { data: featureFlag, isLoading: flagLoading } = useQuickBooksFeatureFlag();
  const {
    connection,
    isLoading,
    isConnecting,
    isConnected,
    initiateConnection,
    disconnect,
    isDisconnecting,
  } = useQuickBooksConnection();

  // Don't show if feature flag is disabled
  if (flagLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!featureFlag?.enabled) {
    return null; // Feature is disabled
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              QuickBooks Integration
              <Badge variant="outline" className="text-xs">
                {featureFlag.config?.environment === 'sandbox' ? '🧪 Sandbox' : '🏢 Production'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Connect to QuickBooks Online to sync approved receipts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isConnected && connection ? (
          // Connected State
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected</AlertTitle>
              <AlertDescription className="text-green-700">
                Connected to <strong>{connection.company_name}</strong>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company ID:</span>
                <p className="font-mono text-xs">{connection.realm_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Connected:</span>
                <p>{format(new Date(connection.connected_at), 'MMM d, yyyy')}</p>
              </div>
              {connection.last_sync_at && (
                <div>
                  <span className="text-muted-foreground">Last Sync:</span>
                  <p>{format(new Date(connection.last_sync_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => initiateConnection()}
                disabled={isConnecting}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                Reconnect
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnect()}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          // Not Connected State
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Connect to QuickBooks to enable receipt syncing.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => initiateConnection()}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Connect to QuickBooks
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Intuit to authorize the connection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
