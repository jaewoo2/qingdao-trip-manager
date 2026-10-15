/// <reference lib="webworker" />
import { clientsClaim, cacheNames } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, getCacheKeyForURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };
const manifest = self.__WB_MANIFEST.map(entry => typeof entry === 'string' ? { url: entry, revision: null } : entry);
precacheAndRoute(manifest);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
clientsClaim();
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') { void self.skipWaiting(); return; }
  if (event.data?.type !== 'CHECK_OFFLINE') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheNames.precache);
      const entry = event.data.entry;
      const entryPresent = typeof entry === 'string' && manifest.some(item => new URL(item.url, self.location.href).pathname === entry);
      const checks = await Promise.all(manifest.map(async item => {
        const key = getCacheKeyForURL(new URL(item.url, self.location.href).href);
        return Boolean(key && await cache.match(key));
      }));
      const shell = getCacheKeyForURL(new URL('/index.html', self.location.href).href);
      const ready = manifest.length > 0 && entryPresent && checks.every(Boolean) && Boolean(shell && await cache.match(shell));
      event.ports[0]?.postMessage({ ready, checked: checks.length });
    } catch { event.ports[0]?.postMessage({ ready: false }); }
  })());
});
