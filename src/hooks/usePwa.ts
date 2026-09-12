"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserStore, useBrowserStore } from "./useBrowserState";

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

/** Notification.permission changes only through a prompt, so re-reads are manual. */
const permissionStore = createBrowserStore<NotificationPermission | "unsupported">(
  () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
  "default",
);

/**
 * Local notifications raised through the service worker.
 *
 * This is deliberately not Web Push. Web Push would mean storing a
 * subscription endpoint per device on our server, which is the only piece of
 * per-user data this app would ever hold. Doing the proximity check in the tab
 * and raising the notification locally keeps the "no user database" property
 * intact. The tradeoff is honest: alerts fire while the app is open or
 * recently backgrounded, not when it has been closed for hours.
 */
export function useLocalAlerts() {
  const permission = useBrowserStore(permissionStore);

  const request = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
    permissionStore.notify();
  }, []);

  const notify = useCallback(
    async (
      hazards: Array<{ id: string; title: string; body: string; severity: string }>,
    ) => {
      if (permission !== "granted" || hazards.length === 0) return;
      const registration = await navigator.serviceWorker?.ready;
      registration?.active?.postMessage({ type: "nearby-hazards", events: hazards });
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
