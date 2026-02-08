import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { startSyncService } from '@/utils/backgroundSync';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

createRoot(document.getElementById("root")!).render(<App />);

// Initialize background sync service
startSyncService();

// Register service worker only in production (dev: no SW so updates always visible)
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Show update notification to user
      toast('Update Available', {
        description: 'A new version of ProfitBuild is ready',
        action: {
          label: 'Reload Now',
          onClick: () => {
            updateSW(true);
            window.location.reload();
          }
        },
        duration: Infinity, // Don't auto-dismiss
        dismissible: true, // Allow user to dismiss and continue working
      });
    },
    onOfflineReady() {
      console.log('App ready to work offline');
      toast('App Ready', {
        description: 'ProfitBuild is ready to work offline',
        duration: 3000,
      });
    },
    onRegisteredSW(_, registration) {
      if (registration) {
        // Check immediately on app open
        registration.update().catch(err => {
          console.log('Initial update check failed:', err);
        });
      }
    },
  });

  // Check for updates when user returns to the app
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.update().catch(err => {
            console.log('Visibility update check failed:', err);
          });
        }
      });
    }
  });
}
