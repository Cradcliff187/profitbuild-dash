/**
 * Platform detection utilities for PWA (Progressive Web App)
 */

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export function isNativePlatform(): boolean {
  return false; // PWA-only app, always web-based
}

export function isWebPlatform(): boolean {
  return true; // Always true for PWA
}

export function getPlatformName(): string {
  return 'web'; // Always 'web' for PWA
}

export function isIOSDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isIOSUA = /ipad|iphone|ipod/.test(ua);
  const isMacWithTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUA || isMacWithTouch;
}

export function isIOSPWA(): boolean {
  if (!isIOSDevice()) return false;
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true;
  return isStandalone;
}

export function isIOSSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /ipad|iphone|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
  return isIOS && isSafari;
}

export function isAndroidChrome(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /android/.test(ua) && /chrome/.test(ua) && !/edge|edg/.test(ua);
}

export function canUseInstallPrompt(): boolean {
  return !isIOSDevice() && 'BeforeInstallPromptEvent' in window;
}

export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}
