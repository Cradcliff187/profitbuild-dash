import { useEffect, useState } from 'react';
import { Share, Download, Menu, CheckCircle2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isIOSDevice, isAndroidChrome, isPWAInstalled } from '@/utils/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (isPWAInstalled()) {
      setAlreadyInstalled(true);
      return;
    }

    // Detect platform
    if (isIOSDevice()) {
      setPlatform('ios');
    } else if (isAndroidChrome()) {
      setPlatform('android');
      
      // Listen for install prompt on Android
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener('beforeinstallprompt', handler);
      
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    } else {
      setPlatform('desktop');
    }
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (alreadyInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">App Already Installed</CardTitle>
            <CardDescription>
              You're all set! The app is installed and will update automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Install Construction Profit Tracker</h1>
          <p className="text-muted-foreground">
            Install our app for quick access, offline support, and automatic updates
          </p>
        </div>

        {platform === 'ios' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share className="h-5 w-5" />
                Install on iPhone or iPad
              </CardTitle>
              <CardDescription>
                Follow these steps to add the app to your home screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    1
                  </div>
                  <div>
                    <p className="font-medium mb-1">Tap the Share button</p>
                    <p className="text-sm text-muted-foreground">
                      Look for the <Share className="inline h-4 w-4 mx-1" /> Share icon at the bottom of Safari
                      (on iPhone) or at the top (on iPad)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    2
                  </div>
                  <div>
                    <p className="font-medium mb-1">Scroll and tap "Add to Home Screen"</p>
                    <p className="text-sm text-muted-foreground">
                      In the share menu, scroll down and look for "Add to Home Screen" option
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    3
                  </div>
                  <div>
                    <p className="font-medium mb-1">Tap "Add"</p>
                    <p className="text-sm text-muted-foreground">
                      Confirm by tapping "Add" in the top right corner
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    4
                  </div>
                  <div>
                    <p className="font-medium mb-1">Done!</p>
                    <p className="text-sm text-muted-foreground">
                      The app icon will appear on your home screen. Tap it to launch the app.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm font-medium mb-1">✨ Benefits:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Quick access from your home screen</li>
                  <li>• Works offline</li>
                  <li>• Automatic updates (no re-installation needed)</li>
                  <li>• Full-screen experience</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {platform === 'android' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Install on Android
              </CardTitle>
              <CardDescription>
                Add the app to your home screen for quick access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {deferredPrompt ? (
                <div className="text-center py-4">
                  <Button onClick={handleAndroidInstall} size="lg" className="w-full">
                    <Download className="h-5 w-5 mr-2" />
                    Install App
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    Click the button above for one-tap installation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                      1
                    </div>
                    <div>
                      <p className="font-medium mb-1">Tap the menu button</p>
                      <p className="text-sm text-muted-foreground">
                        Look for the <Menu className="inline h-4 w-4 mx-1" /> three-dot menu in the top right of Chrome
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                      2
                    </div>
                    <div>
                      <p className="font-medium mb-1">Select "Install app" or "Add to Home screen"</p>
                      <p className="text-sm text-muted-foreground">
                        Tap this option in the menu
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                      3
                    </div>
                    <div>
                      <p className="font-medium mb-1">Confirm installation</p>
                      <p className="text-sm text-muted-foreground">
                        Tap "Install" in the popup dialog
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm font-medium mb-1">✨ Benefits:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Quick access from your home screen</li>
                  <li>• Works offline</li>
                  <li>• Automatic updates (no re-installation needed)</li>
                  <li>• Full-screen experience</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {platform === 'desktop' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Only Feature
              </CardTitle>
              <CardDescription>
                App installation is only available on mobile devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To install the Construction Profit Tracker app, please visit this page on your mobile device (iPhone, iPad, or Android phone/tablet).
              </p>
              <p className="text-sm text-muted-foreground">
                On mobile devices, you'll be able to add the app to your home screen for quick access, offline support, and an app-like experience.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm font-medium mb-2">Desktop users:</p>
                <p className="text-sm text-muted-foreground">
                  You can continue using the app directly in your browser. Simply bookmark this page for quick access.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Install;
