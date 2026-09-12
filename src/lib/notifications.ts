"use client";

import { Capacitor } from "@capacitor/core";

/**
 * Alerts, on two very different platforms.
 *
 * On the web this uses the Notifications API through the service worker. In
 * the packaged Android app that API does not exist: Android's WebView has
 * never implemented Web Notifications, so `Notification` is undefined there
 * and the browser path silently does nothing. The bug was invisible, because
 * the code correctly reported "not supported" and simply hid the toggle.
 *
 * So the app path goes through Capacitor's LocalNotifications instead, which
 * posts a real Android notification through the system tray.
 *
 * What both paths share is the important property: the decision to alert is
 * made on the device. Proximity is computed in the page against a list the
 * server already sent, and the notification is raised locally. No device token
 * is registered anywhere, and no server is told where anyone is or what they
 * were warned about.
 */
export type AlertPermission = "granted" | "denied" | "default" | "unsupported";

export interface AlertItem {
  id: string;
  title: string;
  body: string;
  severity: string;
}

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Android notification ids must be 32-bit integers, but hazard ids are strings
 * like "bipad-94283". Hashing keeps the mapping stable, so re-alerting about
 * the same hazard replaces its notification rather than stacking a duplicate.
 */
function idToInt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2_000_000_000;
}

async function nativeModule() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

export async function readPermission(): Promise<AlertPermission> {
  if (isNativeApp()) {
    try {
      const LocalNotifications = await nativeModule();
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "granted") return "granted";
      if (display === "denied") return "denied";
      return "default";
    } catch {
      return "unsupported";
    }
  }

  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as AlertPermission;
}

export async function requestPermission(): Promise<AlertPermission> {
  if (isNativeApp()) {
    try {
      const LocalNotifications = await nativeModule();
      const { display } = await LocalNotifications.requestPermissions();
      return display === "granted" ? "granted" : display === "denied" ? "denied" : "default";
    } catch {
      return "unsupported";
    }
  }

  if (typeof Notification === "undefined") return "unsupported";
  const result = await Notification.requestPermission();
  return result as AlertPermission;
}

export async function raiseAlerts(items: AlertItem[]): Promise<void> {
  if (items.length === 0) return;

  if (isNativeApp()) {
    const LocalNotifications = await nativeModule();
    await LocalNotifications.schedule({
      notifications: items.map((item) => ({
        id: idToInt(item.id),
        title: item.title,
        body: item.body,
        smallIcon: "ic_launcher",
        // A hazard alert should survive a swipe past the shade.
        ongoing: false,
        autoCancel: true,
        // Fires immediately; nothing here is scheduled for later.
        schedule: undefined,
        extra: { severity: item.severity },
      })),
    });
    return;
  }

  // Web: hand off to the service worker, which owns the notification.
  const registration = await navigator.serviceWorker?.ready;
  registration?.active?.postMessage({ type: "nearby-hazards", events: items });
}

/**
 * Android 13 and later require an explicit channel for notifications to have a
 * name and importance a user can see in system settings. Created once at
 * startup; harmless elsewhere.
 */
export async function ensureChannel(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const LocalNotifications = await nativeModule();
    await LocalNotifications.createChannel({
      id: "hazards",
      name: "Nearby hazards",
      description: "Alerts when a serious hazard is reported close to you",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch (error) {
    console.error("notification channel setup failed:", error);
  }
}
