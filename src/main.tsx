import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { startSyncService } from '@/utils/backgroundSync';

createRoot(document.getElementById("root")!).render(<App />);

// Initialize background sync service
startSyncService();

// Register service worker
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast.info('🎉 New version available!', {
        duration: Infinity,
        dismissible: false,
        action: {
          label: 'Update Now',
          onClick: () => {
            toast.success('Updating app...');
            updateSW(true);
          },
        },
      });
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}
