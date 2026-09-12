/*
 * Service worker for offline access and home-screen install.
 *
 * Caching policy is deliberately asymmetric. The app shell is cached
 * aggressively so the page opens during an outage, which is exactly when
 * people need it. Hazard data is network-first and is only ever served from
 * cache as a last resort, because showing a stale "all clear" during a live
 * emergency would be worse than showing nothing. Responses served from cache
 * carry an x-from-cache header so the interface can say so out loud.
 */
const SHELL_CACHE = "shell-v1";
const DATA_CACHE = "data-v1";

const SHELL_ASSETS = ["/", "/prepare", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // One missing asset must not abort the whole install.
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((a) => cache.add(a))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (!cached) throw error;
    // Flag the staleness so the UI can label it rather than imply it is live.
    const headers = new Headers(cached.headers);
    headers.set("x-from-cache", "1");
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok && new URL(request.url).origin === self.location.origin) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
    return;
  }
  event.respondWith(cacheFirst(request));
});

/*
 * Proximity alerts.
 *
 * The page posts the events it considers nearby and the worker raises a system
 * notification. Nothing about the user's location is transmitted anywhere: the
 * distance check runs in the page, and the worker only ever sees the hazards
 * that already passed it.
 */
const seen = new Set();

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "nearby-hazards" || !Array.isArray(data.events)) return;

  event.waitUntil(
    (async () => {
      const granted = (await self.registration.getNotifications?.()) !== undefined;
      if (!granted) return;
      for (const hazard of data.events.slice(0, 3)) {
        if (!hazard?.id || seen.has(hazard.id)) continue;
        seen.add(hazard.id);
        await self.registration.showNotification(hazard.title ?? "Hazard nearby", {
          body: hazard.body ?? "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: hazard.id,
          renotify: false,
          requireInteraction: hazard.severity === "critical",
          data: { url: "/" },
        });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    }),
  );
});
