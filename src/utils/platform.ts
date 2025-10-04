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
