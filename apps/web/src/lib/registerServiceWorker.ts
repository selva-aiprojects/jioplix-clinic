const SW_PATH = '/sw.js'

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return

  // In development, unregister any active service workers and clear cache storage
  // to avoid stale Vite chunk caching, outdated dependency 504s, and HMR token mismatches.
  if (import.meta.env.DEV) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.unregister()
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          await caches.delete(key)
        }
      }
    } catch (err) {
      console.warn('[SW] Failed to unregister dev service worker:', err)
    }
    return
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    })

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' })
          window.dispatchEvent(new CustomEvent('sw-update'))
        }
      })
    })
  } catch (err) {
    console.error('[SW] Registration failed:', err)
  }
}
