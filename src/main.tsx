import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { startSyncService } from '@/utils/backgroundSync';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Debug: Check if running as standalone PWA
const isPWAStandalone = window.matchMedia('(display-mode: standalone)').matches;
console.log('PWA Mode:', isPWAStandalone ? 'Standalone' : 'Browser');

createRoot(document.getElementById("root")!).render(<App />);

// Initialize background sync service
startSyncService();

// Register service worker
if ('serviceWorker' in navigator) {
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
        
        // Then check for updates every minute while app is open
        setInterval(() => {
          registration.update().catch(err => {
            console.log('Periodic update check failed:', err);
          });
        }, 60 * 1000);
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
