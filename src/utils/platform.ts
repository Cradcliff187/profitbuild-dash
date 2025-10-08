import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for cross-platform functionality
 */

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isWebPlatform(): boolean {
  return !Capacitor.isNativePlatform();
}

export function getPlatformName(): string {
  return Capacitor.getPlatform(); // 'web', 'ios', 'android'
}

export function isIOSDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isIOSUA = /ipad|iphone|ipod/.test(ua);
  const isMacWithTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUA || isMacWithTouch;
}
