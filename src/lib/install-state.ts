"use client";

import { createBrowserStore } from "@/hooks/useBrowserState";

/**
 * Which install route actually applies to this visitor.
 *
 * Offering an APK to an iPhone, or Safari instructions to a desktop, is worse
 * than offering nothing: it teaches people the app is not for them.
 */
export type Platform = "android" | "ios" | "other";

export const platformStore = createBrowserStore<Platform>(() => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // iPadOS reports itself as a Mac, so a touch-capable Mac is treated as iOS.
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "other";
}, "other");

const DISMISS_KEY = "nda.install-dismissed";

export const dismissedStore = createBrowserStore<boolean>(() => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Private mode and blocked site data both throw; show the card.
    return false;
  }
}, false);

export function dismissInstallCard() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* Not remembered, but the card still closes for this visit. */
  }
  dismissedStore.notify();
}
