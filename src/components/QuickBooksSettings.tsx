import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link2, Unlink, CheckCircle2, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksSync } from '@/hooks/useQuickBooksSync';
import { QuickBooksBackfillModal } from '@/components/QuickBooksBackfillModal';
import { format } from 'date-fns';

export function QuickBooksSettings() {
  const { isEnabled: featureFlagEnabled, isLoading: flagLoading } = useQuickBooksSync();
  const {
    connection,
    isLoading,
    isConnecting,
    isConnected,
    initiateConnection,
    disconnect,
    isDisconnecting,
  } = useQuickBooksConnection();
  const [showBackfillModal, setShowBackfillModal] = useState(false);

  // Don't show if feature flag is loading
  if (flagLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if feature flag is disabled
  if (!featureFlagEnabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              QuickBooks Integration
              {connection && (
                <Badge variant="outline" className="text-xs">
                  {connection.environment === 'sandbox' ? '🧪 Sandbox' : '🏢 Production'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect to QuickBooks Online to sync transactions and data
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
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Connected</AlertTitle>
              <AlertDescription>
                Your QuickBooks account is connected and ready to sync.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 text-sm">
              {connection.company_name && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{connection.company_name}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium capitalize">{connection.environment}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Connected On</span>
                <span className="font-medium">
                  {format(new Date(connection.connected_at), 'MMM d, yyyy')}
                </span>
              </div>

              {connection.last_sync_at && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="font-medium">
                    {format(new Date(connection.last_sync_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}

              {connection.last_error && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground text-red-600">Last Error</span>
                  <span className="font-medium text-red-600 text-xs max-w-xs truncate">
                    {connection.last_error}
                  </span>
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

            {/* One-Time Reconciliation Tool */}
            <div className="pt-4 border-t">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">QuickBooks ID Backfill</h4>
                  <p className="text-xs text-muted-foreground">
                    One-time tool to match existing database records with QuickBooks transactions and prevent duplicates.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowBackfillModal(true)}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Run Reconciliation
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Not Connected State
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Connect to QuickBooks to enable transaction syncing and data integration.
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
      
      <QuickBooksBackfillModal
        open={showBackfillModal}
        onClose={() => setShowBackfillModal(false)}
        onSuccess={() => {
          setShowBackfillModal(false);
        }}
      />
    </Card>
  );
}
