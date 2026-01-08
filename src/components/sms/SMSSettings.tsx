// src/components/sms/SMSSettings.tsx

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Copy, Check, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SMSSettings() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKey = async () => {
    setIsLoading(true);
    setError(null);
    setApiKey(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('get-textbelt-key', {
        method: 'GET',
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to retrieve API key');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.apiKey) {
        setApiKey(data.apiKey);
        toast.success('API key retrieved successfully');
      } else {
        throw new Error('API key not found in response');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to retrieve API key';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error fetching API key:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Text Belt API Key
          </CardTitle>
          <CardDescription>
            Retrieve your Text Belt API key for renewal or configuration purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a temporary function. After retrieving your API key, please delete the{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">get-textbelt-key</code> function
              from Supabase for security.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={apiKey || ''}
                readOnly
                placeholder="Click 'Retrieve API Key' to fetch"
                className="font-mono text-sm"
              />
              {apiKey && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={fetchApiKey}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retrieving...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Retrieve API Key
                </>
              )}
            </Button>
            <Button
              variant="outline"
              asChild
            >
              <a
                href="https://textbelt.com/purchase"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Renew Credits
              </a>
            </Button>
          </div>

          {apiKey && (
            <Alert>
              <AlertDescription>
                <strong>Next Steps:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Copy the API key above</li>
                  <li>Visit{' '}
                    <a
                      href="https://textbelt.com/purchase"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      textbelt.com/purchase
                    </a>{' '}
                    to renew your credits
                  </li>
                  <li>Delete the <code className="text-xs bg-muted px-1 py-0.5 rounded">get-textbelt-key</code> function from Supabase Dashboard → Edge Functions</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
