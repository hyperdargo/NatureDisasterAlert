"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserStore, useBrowserStore } from "./useBrowserState";
import {
  ensureChannel,
  raiseAlerts,
  readPermission,
  requestPermission,
  type AlertItem,
  type AlertPermission,
} from "@/lib/notifications";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True once the app is running from the home screen rather than a browser tab. */
const standaloneStore = createBrowserStore(
  () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, which never became standard.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  false,
  (onChange) => {
    const query = window.matchMedia("(display-mode: standalone)");
    query.addEventListener("change", onChange);
    window.addEventListener("appinstalled", onChange);
    return () => {
      query.removeEventListener("change", onChange);
      window.removeEventListener("appinstalled", onChange);
    };
  },
);

const iosStore = createBrowserStore(
  () => /iphone|ipad|ipod/i.test(navigator.userAgent),
  false,
);

/**
 * Service worker registration plus the install-to-home-screen flow.
 *
 * Chrome and Edge fire `beforeinstallprompt`, which we capture so the offer
 * can be made at a sensible moment instead of by the browser's own banner.
 * iOS Safari fires nothing and installs only through the Share sheet, so it is
 * detected separately and given instructions rather than a dead button.
 */
export function usePwa() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const installed = useBrowserStore(standaloneStore);
  const isIos = useBrowserStore(iosStore);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registered after load so it never competes with first paint.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => console.error("service worker registration failed:", error));
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Suppress the browser's own banner so the offer appears in context.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    standaloneStore.notify();
  }, [installEvent]);

  return {
    canInstall: installEvent !== null && !installed,
    installed,
    iosInstructions: isIos && !installed,
    install,
  };
}

/**
 * Alerts when a serious hazard is reported nearby.
 *
 * Delegates to src/lib/notifications.ts, which picks the right mechanism for
 * the platform: the Notifications API on the web, Capacitor's
 * LocalNotifications inside the packaged Android app. Android's WebView has
 * never implemented Web Notifications, so the browser path is not merely
 * degraded there, it is absent.
 *
 * Either way the proximity check runs on the device and the alert is raised
 * locally. No push subscription is stored on any server, so there is no
 * per-device record to leak and nothing to unsubscribe from.
 */
export function useLocalAlerts() {
  const [permission, setPermission] = useState<AlertPermission>("default");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await ensureChannel();
      const current = await readPermission();
      if (!cancelled) setPermission(current);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    const result = await requestPermission();
    setPermission(result);
  }, []);

  const notify = useCallback(
    async (hazards: AlertItem[]) => {
      if (permission !== "granted" || hazards.length === 0) return;
      try {
        await raiseAlerts(hazards);
      } catch (error) {
        console.error("could not raise alert:", error);
      }
    },
    [permission],
  );

  return {
    supported: permission !== "unsupported",
    enabled: permission === "granted",
    request,
    notify,
  };
}
