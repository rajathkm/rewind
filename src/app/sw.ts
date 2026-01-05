/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Custom caching strategies
const imageCache = new CacheFirst({
  cacheName: "images-v1",
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (response && response.status === 200) {
          return response;
        }
        return null;
      },
    },
  ],
  matchOptions: {
    ignoreSearch: true,
  },
});

const apiCache = new StaleWhileRevalidate({
  cacheName: "api-cache-v1",
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (response && response.status === 200) {
          return response;
        }
        return null;
      },
    },
  ],
});

const contentCache = new NetworkFirst({
  cacheName: "content-cache-v1",
  networkTimeoutSeconds: 3,
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        if (response && response.status === 200) {
          return response;
        }
        return null;
      },
    },
  ],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Static assets - cache first
    {
      matcher: ({ request }) =>
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "font",
      handler: new CacheFirst({
        cacheName: "static-assets-v1",
      }),
    },
    // Images - cache first with network fallback
    {
      matcher: ({ request }) => request.destination === "image",
      handler: imageCache,
    },
    // API routes - stale while revalidate
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: apiCache,
    },
    // Content pages - network first
    {
      matcher: ({ request, url }) =>
        request.destination === "document" &&
        (url.pathname.startsWith("/content/") || url.pathname.startsWith("/subscriptions/")),
      handler: contentCache,
    },
    // Default cache behavior
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-content-state") {
    event.waitUntil(syncContentState());
  }
});

async function syncContentState() {
  // This will be implemented to sync read/saved states when back online
  console.log("[SW] Syncing content state...");
}

// Handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || "Rewind", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: data.tag || "default",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.notification.data?.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});

serwist.addEventListeners();
