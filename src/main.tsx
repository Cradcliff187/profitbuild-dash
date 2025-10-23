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

// Register service worker
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Auto-apply updates immediately without user prompt
      updateSW(true);
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
    onRegisteredSW(_, registration) {
      // Check for updates every minute while app is open
      if (registration) {
        setInterval(() => registration.update(), 60 * 1000);
      }
    },
  });
}
