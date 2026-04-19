import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from 'sonner';
import { startSyncService } from '@/utils/backgroundSync';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

createRoot(document.getElementById("root")!).render(<App />);

// Initialize background sync service
startSyncService();

// Service worker registration.
// We bypass vite-plugin-pwa's `registerSW` helper because it does not expose
// the `updateViaCache: 'none'` option — which is the critical flag that
// tells the browser to SKIP its HTTP cache when checking /sw.js for updates.
// Without it, hosting-layer caching of /sw.js leaves mobile PWAs stuck on
// stale versions indefinitely.
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  let reloading = false;

  // When a new SW calls skipWaiting() + activates, the browser swaps the
  // controller. Reload once so the page picks up the new code. Gated by
  // `reloading` so Firefox/Chrome don't double-reload on rapid controller
  // changes during dev/testing.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((registration) => {
      // Initial update check on app open
      registration.update().catch(() => {});

      // Re-check when the user returns to the app (tab focus / resumed PWA)
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      // Detect a new SW becoming available and prompt the user
      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          // Only prompt if there's an existing controller — otherwise this is
          // the initial install, not an update.
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Update Available', {
              description: 'A new version of RCG Work is ready',
              action: {
                label: 'Reload Now',
                onClick: () => {
                  newSW.postMessage({ type: 'SKIP_WAITING' });
                  // controllerchange listener above will handle the reload
                },
              },
              duration: Infinity,
              dismissible: true,
            });
          }
        });
      });

      // Also cover the case where a SW was already waiting when the page
      // loaded (e.g. user closed the tab before accepting the prior prompt).
      if (registration.waiting && navigator.serviceWorker.controller) {
        const waitingSW = registration.waiting;
        toast('Update Available', {
          description: 'A new version of RCG Work is ready',
          action: {
            label: 'Reload Now',
            onClick: () => {
              waitingSW.postMessage({ type: 'SKIP_WAITING' });
            },
          },
          duration: Infinity,
          dismissible: true,
        });
      }
    })
    .catch((err) => {
      console.error('Service worker registration failed:', err);
    });
}
