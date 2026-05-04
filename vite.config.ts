import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from 'child_process';

// Auto-generate version from Git — format: YYYY.MM.DD (build {sha})
// Falls back to build date when git isn't available (e.g., Lovable's build env)
const getVersion = () => {
  try {
    const commitDate = execSync('git log -1 --format=%ci HEAD').toString().trim();
    const date = new Date(commitDate);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const commitSha = execSync('git rev-parse --short HEAD').toString().trim();
    return `${yyyy}.${mm}.${dd} (build ${commitSha})`;
  } catch {
    // Git unavailable — use build timestamp instead of static package.json version
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} (build latest)`;
  }
};

const appVersion = getVersion();

// Emits dist/version.json at build time. The Settings "Check for Updates"
// button fetches this with cache: 'no-store' and compares to __APP_VERSION__
// baked into the running JS — a string-compare on a no-cache fetch is
// trustworthy in a way the SW byte-comparison heuristic isn't (especially on
// iOS PWAs where the SW lifecycle is sticky). When versions differ the user
// gets a Force Update path that nukes the SW + caches + hard reloads.
const versionJsonPlugin = () => ({
  name: 'emit-version-json',
  apply: 'build' as const,
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: appVersion, buildTime: new Date().toISOString() }),
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    '__APP_VERSION__': JSON.stringify(appVersion),
  },
  server: {
    host: "::",
    // Pinned to 5225 (5xxx Vite range + RCG project-number prefix 225) so this
    // dev server has a stable, unique port. strictPort: true means Vite fails
    // loudly if 5225 is busy instead of silently falling through to a random
    // port — that silent fallthrough used to break Claude Preview / launch.json
    // when another local Vite project (e.g. radcliff-builders-portal) was on
    // 8080. If you change this, update .claude/launch.json to match.
    port: 5225,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch'
          ],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-supabase': ['@supabase/supabase-js', '@tanstack/react-query'],
          'vendor-date': ['date-fns', 'react-day-picker'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionJsonPlugin(),
    VitePWA({
      devOptions: { enabled: false },
      // 'prompt' (not 'autoUpdate') because we manually register the SW in
      // main.tsx with { updateViaCache: 'none' } to bypass HTTP cache on SW
      // script fetches — the root cause of mobile PWAs getting stuck on stale
      // versions. See [src/main.tsx] for the lifecycle.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-180.png', 'pwa-apple-touch-180x180.png', 'favicon.ico'],
      manifest: {
        name: 'RCG Work',
        short_name: 'RCG Work',
        description: 'Professional construction project management for RCG - track profits, estimates, quotes, and expenses.',
        theme_color: '#0F172A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            // Opaque solid-bg variant — used as the Android home-screen icon
            // when the PWA is installed via "Add to Home Screen". The
            // transparent /icon-192.png rendered as a dark cube on whatever
            // background Android chose, same class of bug as the iOS
            // apple-touch-icon fix above.
            src: '/pwa-android-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-180.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        // skipWaiting/clientsClaim are false so the new SW stays in 'waiting'
        // until the user clicks "Reload Now" in the Update Available toast.
        // That avoids surprise mid-session reloads that would drop in-progress
        // form state. The SW listens for { type: 'SKIP_WAITING' } postMessage
        // to activate on demand (workbox GenerateSW includes this handler).
        clientsClaim: false,
        skipWaiting: false,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {},
  test: {
    globals: true,
    environment: 'jsdom',
  },
}));

